package io.fairspace.saturn.rdf.search;

import org.apache.jena.query.text.Entity;
import org.apache.jena.query.text.TextIndex;
import org.apache.jena.query.text.TextIndexConfig;
import org.apache.jena.query.text.es.TextIndexES;
import org.elasticsearch.action.ActionListener;
import org.elasticsearch.action.bulk.BulkRequest;
import org.elasticsearch.action.bulk.BulkResponse;
import org.elasticsearch.action.index.IndexRequest;
import org.elasticsearch.action.update.UpdateRequest;
import org.elasticsearch.client.Client;
import org.elasticsearch.client.transport.TransportClient;
import org.elasticsearch.common.xcontent.XContentBuilder;
import org.elasticsearch.script.Script;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static org.elasticsearch.common.xcontent.XContentFactory.jsonBuilder;

/**
 * Bulk Elastic Search Implementation of {@link TextIndex}
 */
public class TextIndexESBulk extends TextIndexES implements ActionListener<BulkResponse> {
    private static final String DASH = "-";

    private static final String UNDERSCORE = "_";

    /**
     * ES Script for adding/updating the document in the index.
     * The main reason to use scripts is because we want to modify the values of the fields that contains an array of values
     */
    private static final String ADD_UPDATE_SCRIPT = "if((ctx._source == null) || (ctx._source.<fieldName> == null) || (ctx._source.<fieldName>.empty == true)) " +
            "{ctx._source.<fieldName>=[params.fieldValue] } else {ctx._source.<fieldName>.add(params.fieldValue)}";

    /**
     * ES Script for deleting a specific value in the field for the given document in the index.
     * The main reason to use scripts is because we want to delete specific value of the field that contains an array of values
     */
    private static final String DELETE_SCRIPT = "if((ctx._source != null) && (ctx._source.<fieldToRemove> != null) && (ctx._source.<fieldToRemove>.empty != true) " +
            "&& (ctx._source.<fieldToRemove>.indexOf(params.valueToRemove) >= 0)) " +
            "{ctx._source.<fieldToRemove>.remove(ctx._source.<fieldToRemove>.indexOf(params.valueToRemove))}";

    private static final Logger LOGGER = LoggerFactory.getLogger(TextIndexESBulk.class);

    private static final int QUEUE_SIZE = 20;

    private final Client client;
    private final String indexName;
    private final List<UpdateRequest> updates = new ArrayList<>();
    private final ExecutorService singleThreadExecutor = new ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<>(QUEUE_SIZE));


    /**
     * Constructor used mainly for performing Integration tests
     *
     * @param config an instance of {@link TextIndexConfig}
     * @param client an instance of {@link TransportClient}. The client should already have been initialized with an index
     */
    public TextIndexESBulk(TextIndexConfig config, Client client, String indexName) {
        super(config, client, indexName);
        this.client = client;
        this.indexName = indexName;
    }

    @Override
    public void commit() {
        if (updates.isEmpty()) {
            return;
        }

        var bulk = new BulkRequest();
        updates.forEach(bulk::add);
        updates.clear();

        singleThreadExecutor.submit(() -> client.bulk(bulk, this));
    }

    @Override
    public void rollback() {
        updates.clear();
    }

    @Override
    public void close() {
        updates.clear();
        singleThreadExecutor.shutdown();
    }

    /**
     * Update an Entity. Since we are doing Upserts in add entity anyway, we simply call {@link #addEntity(Entity)}
     * method that takes care of updating the Entity as well.
     *
     * @param entity the entity to update.
     */
    @Override
    public void updateEntity(Entity entity) {
        //Since Add entity also updates the indexed document in case it already exists,
        // we can simply call the addEntity from here.
        addEntity(entity);
    }


    /**
     * Add an Entity to the ElasticSearch Index.
     * The entity will be added as a new document in ES, if it does not already exists.
     * If the Entity exists, then the entity will simply be updated.
     * The entity will never be replaced.
     *
     * @param entity the entity to add
     */
    @Override
    public void addEntity(Entity entity) {
        LOGGER.trace("Adding/Updating the entity {} in ES", entity.getId());

        //The field that has a not null value in the current Entity instance.
        //Required, mainly for building a script for the update command.
        String fieldToAdd = null;
        String fieldValueToAdd = null;
        try {
            XContentBuilder builder = jsonBuilder()
                    .startObject();

            for (String field : getDocDef().fields()) {
                if (entity.get(field) != null) {
                    if (entity.getLanguage() != null && !entity.getLanguage().isEmpty()) {
                        //We make sure that the field name contains all underscore and no dash (for eg. when the lang value is en-GB)
                        //The reason to do this is because the script fails with exception in case we have "-" in field name.
                        fieldToAdd = normalizeFieldName(field, entity.getLanguage());
                    } else {
                        fieldToAdd = field;
                    }

                    fieldValueToAdd = (String) entity.get(field);
                    builder = builder.field(fieldToAdd, Arrays.asList(fieldValueToAdd));
                    break;
                } else {
                    //We are making sure that the field is at-least added to the index.
                    //This will help us tremendously when we are appending the data later in an already indexed document.
                    builder = builder.field(field, Collections.emptyList());
                }
            }

            builder = builder.endObject();
            IndexRequest indexRequest = new IndexRequest(indexName, getDocDef().getEntityField(), entity.getId())
                    .source(builder);

            String addUpdateScript = ADD_UPDATE_SCRIPT.replaceAll("<fieldName>", fieldToAdd);
            Map<String, Object> params = new HashMap<>();
            params.put("fieldValue", fieldValueToAdd);

            UpdateRequest upReq = new UpdateRequest(indexName, getDocDef().getEntityField(), entity.getId())
                    .script(new Script(Script.DEFAULT_SCRIPT_TYPE, Script.DEFAULT_SCRIPT_LANG, addUpdateScript, params))
                    .upsert(indexRequest);

            updates.add(upReq);

        } catch (Exception e) {
            LOGGER.error("Unable to Index the Entity in ElasticSearch.", e);
        }
    }

    /**
     * Delete the value of the entity from the existing document, if any.
     * The document itself will never get deleted. Only the value will get deleted.
     *
     * @param entity entity whose value needs to be deleted
     */
    @Override
    public void deleteEntity(Entity entity) {

        String fieldToRemove = null;
        String valueToRemove = null;
        for (String field : getDocDef().fields()) {
            if (entity.get(field) != null) {
                fieldToRemove = field;
                if (entity.getLanguage() != null && !entity.getLanguage().isEmpty()) {
                    fieldToRemove = normalizeFieldName(fieldToRemove, entity.getLanguage());
                }
                valueToRemove = (String) entity.get(field);
                break;
            }
        }

        if (fieldToRemove != null && valueToRemove != null) {
            LOGGER.trace("deleting content related to entity {}", entity.getId());
            String deleteScript = DELETE_SCRIPT.replaceAll("<fieldToRemove>", fieldToRemove);
            Map<String, Object> params = new HashMap<>();
            params.put("valueToRemove", valueToRemove);

            UpdateRequest updateRequest = new UpdateRequest(indexName, getDocDef().getEntityField(), entity.getId())
                    .script(new Script(Script.DEFAULT_SCRIPT_TYPE, Script.DEFAULT_SCRIPT_LANG, deleteScript, params));

            updates.add(updateRequest);
        }
    }

    private String normalizeFieldName(String fieldName, String lang) {
        //We know that the lang field is not null already
        StringBuilder sb = new StringBuilder(fieldName);
        return sb.append(UNDERSCORE).append(lang.replaceAll(DASH, UNDERSCORE)).toString();
    }

    @Override
    public void onResponse(BulkResponse responses) {
        LOGGER.debug("Indexing of {} updates in ElasticSearch took {} ms",
                responses.getItems().length, responses.getIngestTook().millis() + responses.getTook().millis());

        if (responses.hasFailures()) {
            LOGGER.error(responses.buildFailureMessage());
        }
    }

    @Override
    public void onFailure(Exception e) {
        LOGGER.error("Error indexing in ElasticSearch", e);
    }
}
