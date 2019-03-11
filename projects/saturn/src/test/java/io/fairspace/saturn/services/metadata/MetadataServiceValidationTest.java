package io.fairspace.saturn.services.metadata;

import io.fairspace.saturn.services.metadata.validation.MetadataRequestValidator;
import io.fairspace.saturn.services.metadata.validation.ValidationResult;
import org.apache.jena.query.Dataset;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.rdfconnection.RDFConnectionLocal;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import static io.fairspace.saturn.rdf.SparqlUtils.setWorkspaceURI;
import static org.apache.jena.graph.NodeFactory.createURI;
import static org.apache.jena.query.DatasetFactory.createTxnMem;
import static org.apache.jena.rdf.model.ModelFactory.createDefaultModel;
import static org.apache.jena.rdf.model.ResourceFactory.createPlainLiteral;
import static org.apache.jena.rdf.model.ResourceFactory.createProperty;
import static org.apache.jena.rdf.model.ResourceFactory.createResource;
import static org.apache.jena.rdf.model.ResourceFactory.createStatement;
import static org.apache.jena.rdf.model.ResourceFactory.createStringLiteral;
import static org.apache.jena.rdf.model.ResourceFactory.createTypedLiteral;
import static org.apache.jena.system.Txn.executeWrite;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class MetadataServiceValidationTest {
    @Mock
    MetadataRequestValidator validator;

    private static final ValidationResult INVALID_VALIDATION_RESULT = new ValidationResult(false, "Test error");
    private static final String baseURI = "http://example.com/";
    private static final String vocabularyURI = baseURI + "vocabulary";
    private static final String GRAPH = baseURI + "graph";

    private static final Resource S1 = createResource("http://fairspace.io/iri/S1");
    private static final Resource S2 = createResource("http://fairspace.io/iri/S2");
    private static final Resource S3 = createResource("http://fairspace.io/iri/S3");
    private static final Property P1 = createProperty("http://fairspace.io/ontology/P1");
    private static final Property P2 = createProperty("http://fairspace.io/ontology/P2");

    private static final Property MACHINE_ONLY_PROPERTY = createProperty("http://fairspace.io/ontology#filePath");

    private static final Statement STMT1 = createStatement(S1, P1, S2);
    private static final Statement STMT2 = createStatement(S2, P1, S3);
    private static final Statement MACHINE_ONLY_STATEMENT = createStatement(S1, MACHINE_ONLY_PROPERTY, S3);

    private static final Statement LBL_STMT1 = createStatement(S1, RDFS.label, createStringLiteral("subject1"));
    private static final Statement LBL_STMT2 = createStatement(S2, RDFS.label, createStringLiteral("subject2"));

    private Dataset ds;
    private MetadataService api;

    @Before
    public void setUp() {
        setWorkspaceURI(baseURI);
        ds = createTxnMem();
        RDFConnectionLocal rdf = new RDFConnectionLocal(ds);
        api = new MetadataService(rdf, createURI(GRAPH), createURI(vocabularyURI), validator);
    }

    @Test
    public void testPutShouldSucceedOnValidationSuccess() {
        when(validator.validatePut(any())).thenReturn(ValidationResult.VALID);
        api.put(createDefaultModel().add(LBL_STMT1));

        Model model = ds.getNamedModel(GRAPH);
        assertTrue(model.contains(LBL_STMT1));
    }

    @Test(expected = IllegalArgumentException.class)
    public void testPutShouldFailOnValidationError() {
        when(validator.validatePut(any())).thenReturn(INVALID_VALIDATION_RESULT);
        api.put(createDefaultModel());
    }

    @Test
    public void testPatchShouldSucceedOnValidationSuccess() {
        when(validator.validatePatch(any())).thenReturn(ValidationResult.VALID);
        api.patch(createDefaultModel().add(LBL_STMT1));

        Model model = ds.getNamedModel(GRAPH);
        assertTrue(model.contains(LBL_STMT1));
    }

    @Test(expected = IllegalArgumentException.class)
    public void patchShouldNotAcceptMachineOnlyTriples() {
        when(validator.validatePatch(any())).thenReturn(INVALID_VALIDATION_RESULT);
        api.patch(createDefaultModel());
    }


    @Test
    public void testDeleteShouldSucceedOnValidationSuccess() {
        executeWrite(ds, () -> ds.getNamedModel(GRAPH).add(STMT1));

        when(validator.validateDelete(any(), any(), any())).thenReturn(ValidationResult.VALID);
        api.delete(S1.getURI(), null, null);

        Model model = ds.getNamedModel(GRAPH);
        assertTrue(!model.contains(LBL_STMT1));
    }

    @Test(expected = IllegalArgumentException.class)
    public void deleteShouldFailOnMachineOnlyPredicate() {
        when(validator.validateDelete(any(), eq(MACHINE_ONLY_PROPERTY.getURI()), any())).thenReturn(new ValidationResult(false, "Test"));
        api.delete(null, MACHINE_ONLY_PROPERTY.getURI(), null);
    }

    @Test
    public void testDeleteModelShouldSucceedOnValidationSuccess() {
        executeWrite(ds, () -> ds.getNamedModel(GRAPH).add(STMT1));

        when(validator.validateDelete(any())).thenReturn(ValidationResult.VALID);
        api.delete(createDefaultModel().add(LBL_STMT1));

        Model model = ds.getNamedModel(GRAPH);
        assertFalse(model.contains(LBL_STMT1));
    }

    @Test(expected = IllegalArgumentException.class)
    public void deleteModelShouldNotAcceptMachineOnlyTriples() {
        when(validator.validateDelete(any())).thenReturn(INVALID_VALIDATION_RESULT);
        api.delete(createDefaultModel());
    }

    /**
     * Store the machine-only predicate in the database
     */
    private void setMachineOnlyPredicate(String predicateUri) {
        Resource predicateResource = createResource(predicateUri);

        // Actually update the database itself, as the delete method depends on it
        executeWrite(ds, () -> ds.getNamedModel(vocabularyURI)
                .add(predicateResource, RDF.type, RDF.Property)
                .add(predicateResource, createProperty("http://fairspace.io/ontology#machineOnly"), createTypedLiteral(true)));
    }
}
