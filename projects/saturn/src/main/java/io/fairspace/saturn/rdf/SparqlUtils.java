package io.fairspace.saturn.rdf;

import io.fairspace.saturn.services.search.SearchResultDTO;
import lombok.extern.log4j.Log4j2;
import org.apache.jena.datatypes.xsd.XSDDateTime;
import org.apache.jena.graph.Node;
import org.apache.jena.query.*;
import org.apache.jena.rdf.model.Literal;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.update.UpdateExecutionFactory;
import org.apache.jena.update.UpdateFactory;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.function.Consumer;
import java.util.function.Function;

import static io.fairspace.saturn.config.ConfigLoader.CONFIG;
import static java.util.Optional.ofNullable;
import static java.util.UUID.randomUUID;
import static org.apache.jena.graph.NodeFactory.createURI;
import static org.apache.jena.rdf.model.ResourceFactory.createTypedLiteral;
import static org.apache.jena.system.Txn.*;

@Log4j2
public class SparqlUtils {
    public static Node generateMetadataIri() {
        return generateMetadataIri(randomUUID().toString());
    }

    public static Node generateMetadataIri(String id) {
        return createURI(CONFIG.jena.metadataBaseIRI + id);
    }

    public static Instant parseXSDDateTimeLiteral(Literal literal) {
        return Instant.ofEpochMilli(((XSDDateTime) literal.getValue()).asCalendar().getTimeInMillis());
    }

    public static Literal toXSDDateTimeLiteral(Instant instant) {
        return createTypedLiteral(GregorianCalendar.from(ZonedDateTime.ofInstant(instant, ZoneId.systemDefault())));
    }

    public static <T> List<T> select(Dataset dataset, String query, Function<QuerySolution, T> valueExtractor) {
        var values = new ArrayList<T>();
        querySelect(dataset, query, row -> values.add(valueExtractor.apply(row)));
        return values;
    }

    public static <T> Set<T> selectDistinct(Dataset dataset, String query, Function<QuerySolution, T> valueExtractor) {
        var values = new HashSet<T>();
        querySelect(dataset, query, row -> values.add(valueExtractor.apply(row)));
        return values;
    }

    public static <T> Optional<T> selectSingle(Dataset dataset, String query, Function<QuerySolution, T> valueExtractor) {
        var values = selectDistinct(dataset, query, valueExtractor);
        if (values.size() > 1) {
            throw new IllegalStateException("Too many values: " + values.size());
        }
        return values.stream().findFirst();
    }

    /**
     * Execute a SELECT query and process the rows of the results with the handler code.
     *
     * @param query
     * @param rowAction
     */
    public static void querySelect(Dataset dataset, String query, Consumer<QuerySolution> rowAction) {
        executeRead(dataset, () -> {
            try (var qExec = query(dataset, query)) {
                qExec.execSelect().forEachRemaining(rowAction);
            }
        });
    }

    public static void update(Dataset dataset, String updateString) {
        executeWrite(dataset, () -> UpdateExecutionFactory.create(UpdateFactory.create(updateString), dataset).execute());
    }

    public static String getQueryRegex(String query) {
        return ("(^|\\s|\\.|\\-|\\,|\\;|\\(|\\[|\\{|\\?|\\!|\\\\|\\/|_)"
                + query.replaceAll("[^a-zA-Z0-9]", "\\\\$0"))
                .replace("/\\/g", "\\\\");
    }

    public static List<SearchResultDTO> getByQuery(Query query, QuerySolutionMap binding, Dataset dataset) {
        log.debug("Executing query:\n{}", query);
        var selectExecution = QueryExecutionFactory.create(query, dataset, binding);
        var results = new ArrayList<SearchResultDTO>();

        return calculateRead(dataset, () -> {
            try (selectExecution) {
                //noinspection NullableProblems
                for (var row : (Iterable<QuerySolution>) selectExecution::execSelect) {
                    var id = row.getResource("id").getURI();
                    var label = row.getLiteral("label").getString();
                    var type = ofNullable(row.getResource("type")).map(Resource::getURI).orElse(null);
                    var comment = ofNullable(row.getLiteral("comment")).map(Literal::getString).orElse(null);

                    var dto = SearchResultDTO.builder()
                            .id(id)
                            .label(label)
                            .type(type)
                            .comment(comment)
                            .build();
                    results.add(dto);
                }
            }
            return results;
        });
    }

    private static QueryExecution query(Dataset dataset, String query) {
        return QueryExecutionFactory.create(QueryFactory.create(query), dataset);
    }
}
