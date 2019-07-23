package io.fairspace.saturn.services.metadata;

import io.fairspace.saturn.services.metadata.validation.MetadataRequestValidator;
import io.fairspace.saturn.services.metadata.validation.ValidationException;
import io.fairspace.saturn.services.metadata.validation.Violation;
import org.apache.jena.graph.Node;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdfconnection.RDFConnection;
import org.apache.jena.sparql.core.Quad;
import org.apache.jena.sparql.modify.request.QuadDataAcc;
import org.apache.jena.sparql.modify.request.UpdateDataDelete;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

import static io.fairspace.saturn.rdf.TransactionUtils.commit;
import static io.fairspace.saturn.vocabulary.Inference.applyInference;
import static org.apache.jena.rdf.model.ModelFactory.createDefaultModel;
import static org.apache.jena.rdf.model.ResourceFactory.createResource;

public class ChangeableMetadataService extends ReadableMetadataService {
    static final Resource NIL = createResource("http://fairspace.io/ontology#nil");
    private static final Model EMPTY = createDefaultModel();

    private final MetadataEntityLifeCycleManager lifeCycleManager;
    private final MetadataRequestValidator validator;


    public ChangeableMetadataService(RDFConnection rdf, Node graph, Node vocabulary, MetadataEntityLifeCycleManager lifeCycleManager, MetadataRequestValidator validator) {
        this(rdf, graph, vocabulary, 0, lifeCycleManager, validator);
    }

    public ChangeableMetadataService(RDFConnection rdf, Node graph, Node vocabulary, long tripleLimit, MetadataEntityLifeCycleManager lifeCycleManager, MetadataRequestValidator validator) {
        super(rdf, graph, vocabulary, tripleLimit);
        this.lifeCycleManager = lifeCycleManager;
        this.validator = validator;
    }

    /**
     * Adds all the statements in the given model to the database
     * <p>
     * If the given model contains any statements for which the predicate is marked as machineOnly,
     * an IllegalArgumentException will be thrown
     *
     * @param model
     */
    void put(Model model) {
        commit("Store metadata", rdf, () -> update(EMPTY, model));
    }

    /**
     * Marks an entity as deleted
     *
     * @param subject   Subject URI to mark as deleted
     */
    boolean softDelete(Resource subject) {
        return commit("Mark <" + subject + "> as deleted", rdf, () -> lifeCycleManager.softDelete(subject));
    }

    /**
     * Deletes the statements in the given model from the database.
     * <p>
     * If the model contains any statements for which the predicate is marked as 'machineOnly', an IllegalArgumentException will be thrown.
     *
     * @param model
     */
    void delete(Model model) {
        commit("Delete metadata", rdf, () -> update(model, EMPTY));
    }

    /**
     * Overwrites metadata in the database with statements from the given model.
     * <p>
     * For any subject/predicate combination in the model to add, the existing data in the database will be removed,
     * before adding the new data. This means that if the given model contains a triple
     * S rdfs:label "test"
     * then any statement in the database specifying the rdfs:label for S will be deleted. This effectively overwrites
     * values in the database.
     * <p>
     * If the given model contains any statements for which the predicate is marked as machineOnly,
     * an IllegalArgumentException will be thrown
     *
     * @param model
     */
    void patch(Model model) {
        commit("Update metadata", rdf, () -> {
            var toDelete = createDefaultModel();
            model.listStatements().forEachRemaining(stmt -> {
                // Only explicitly delete triples for URI resources. As this model is also used
                // for validation, we do not want to include blank nodes here. Triples for blank
                // nodes will be deleted automatically when it is not referred to anymore
                if (stmt.getSubject().isURIResource()) {
                    toDelete.add(get(stmt.getSubject().getURI(), stmt.getPredicate().getURI(), null, false));
                }
            });

            update(toDelete, model);
        });
    }

    private void update(Model modelToRemove, Model modelToAdd) {
        // Exclude statements already present in the database from validation
        var unchanged = modelToRemove.intersection(modelToAdd);
        modelToRemove.remove(unchanged);
        modelToAdd.remove(unchanged);
        modelToAdd.removeAll(null, null, NIL);

        var vocabularyModel = rdf.fetch(vocabulary.getURI());

        applyInference(vocabularyModel, modelToRemove);
        applyInference(vocabularyModel, modelToAdd);

        var violations = new LinkedHashSet<Violation>();
        validator.validate(modelToRemove, modelToAdd,
                (message, subject, predicate, object) ->
                        violations.add(new Violation(message, subject.toString(), Objects.toString(predicate, null), Objects.toString(object, null))));

        if (!violations.isEmpty()) {
            throw new ValidationException(violations);
        }

        rdf.update(new UpdateDataDelete(new QuadDataAcc(toQuads(modelToRemove))));

        // Store information on the lifecycle of the entities
        lifeCycleManager.updateLifecycleMetadata(modelToAdd);

        // Store the actual update
        rdf.load(graph.getURI(), modelToAdd);
    }

    private List<Quad> toQuads(Model model) {
        return model.listStatements()
                .mapWith(s -> new Quad(graph, s.asTriple()))
                .toList();
    }
}
