package io.fairspace.saturn.services.metadata;

import io.fairspace.saturn.rdf.transactions.RDFLink;
import lombok.AllArgsConstructor;
import org.apache.jena.graph.Node;
import org.apache.jena.rdf.model.Model;

import static io.fairspace.saturn.rdf.SparqlUtils.limit;
import static io.fairspace.saturn.rdf.SparqlUtils.storedQuery;
import static io.fairspace.saturn.util.ValidationUtils.validateIRI;
import static org.apache.jena.graph.NodeFactory.createURI;

@AllArgsConstructor
public
class ReadableMetadataService {
    protected final RDFLink rdfLink;
    protected final Node graph;
    protected final Node vocabulary;
    protected final long tripleLimit;

    public ReadableMetadataService(RDFLink rdfLink, Node graph, Node vocabulary) {
        this(rdfLink, graph, vocabulary, 0);
    }

    /**
     * Returns a model with statements from the metadata database, based on the given selection criteria
     * <p>
     * If any of the fields is null, that field is not included to filter statements. For example, if only
     * subject is given and predicate and object are null, then all statements with the given subject will be returned.
     *
     * @param subject              Subject URI for which you want to return statements
     * @param predicate            Predicate URI for which you want to return statements
     * @param object               Object URI for which you want to return statements. Literal values are not allowed
     * @param withObjectProperties If set to true, the returned model will also include statements specifying values for
     *                             certain properties marked as fs:importantProperty in the vocabulary
     * @return
     */
    Model get(String subject, String predicate, String object, boolean withObjectProperties) {
        var queryTemplate = withObjectProperties ? "select_by_mask_with_important_properties" : "select_by_mask";

        var query = storedQuery(queryTemplate, graph, asURI(subject), asURI(predicate), asURI(object), vocabulary);

        return runWithLimit(query);
    }

    /**
     * Returns a model with all fairspace metadata entities for the given type
     * <p>
     * The method returns the type and the label (if present) for all entities that match
     * the given type if the type is not marked as fs:machineOnly in the vocabulary.
     * <p>
     * If the type is marked as fs:machineOnly, the resulting model will be empty
     * <p>
     * If the type is null, all entities for which the type is not marked as fs:machineOnly in
     * the vocabulary will be returned.
     *
     * @param type            URI for the type to filter the list of entities on
     * @param filterOnCatalog If set to true, only entities not marked as `fs:machineOnly` will be returned
     * @return
     */
    Model getByType(String type, boolean filterOnCatalog) {
        String queryName = filterOnCatalog ? "catalog_entities_by_type" : "entities_by_type";
        String query = storedQuery(queryName, graph, vocabulary, asURI(type));

        return runWithLimit(query);
    }

    private Model runWithLimit(String query) {
        return rdfLink.calculateRead(rdf -> {
            if (tripleLimit > 0) {
                Model model = rdf.queryConstruct(limit(query, tripleLimit + 1));

                if (model.size() > tripleLimit) {
                    throw new TooManyTriplesException();
                }

                return model;
            } else {
                return rdf.queryConstruct(query);
            }
        });
    }

    protected static Node asURI(String uri) {
        if (uri == null) {
            return null;
        }
        validateIRI(uri);
        return createURI(uri);
    }

}
