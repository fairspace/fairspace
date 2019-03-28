package io.fairspace.saturn.services.metadata;

import io.fairspace.saturn.services.metadata.validation.MetadataRequestValidator;
import io.fairspace.saturn.services.metadata.validation.ValidationException;
import io.fairspace.saturn.services.metadata.validation.ValidationResult;
import org.apache.jena.query.Dataset;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.rdfconnection.RDFConnectionLocal;
import org.apache.jena.vocabulary.RDFS;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import static org.apache.jena.graph.NodeFactory.createURI;
import static org.apache.jena.query.DatasetFactory.createTxnMem;
import static org.apache.jena.rdf.model.ModelFactory.createDefaultModel;
import static org.apache.jena.rdf.model.ResourceFactory.*;
import static org.apache.jena.system.Txn.executeWrite;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class ChangeableMetadataServiceValidationTest {
    @Mock
    MetadataRequestValidator validator;

    @Mock
    private MetadataEntityLifeCycleManager lifeCycleManager;

    private static final ValidationResult INVALID_VALIDATION_RESULT = new ValidationResult("Test error");
    private static final String GRAPH = "http://fairspace.io/iri/graph";

    private static final Resource S1 = createResource("http://fairspace.io/iri/S1");
    private static final Resource S2 = createResource("http://fairspace.io/iri/S2");
    private static final Property P1 = createProperty("http://fairspace.io/ontology/P1");


    private static final Statement STMT1 = createStatement(S1, P1, S2);

    private static final Statement LBL_STMT1 = createStatement(S1, RDFS.label, createStringLiteral("subject1"));

    private Dataset ds;
    private ChangeableMetadataService api;

    @Before
    public void setUp() {
        ds = createTxnMem();
        RDFConnectionLocal rdf = new RDFConnectionLocal(ds);
        api = new ChangeableMetadataService(rdf, createURI(GRAPH), lifeCycleManager, validator);
    }

    @Test
    public void testPutShouldSucceedOnValidationSuccess() {
        when(validator.validatePut(any())).thenReturn(ValidationResult.VALID);
        api.put(createDefaultModel().add(LBL_STMT1));

        Model model = ds.getNamedModel(GRAPH);
        assertTrue(model.contains(LBL_STMT1));
    }

    @Test(expected = ValidationException.class)
    public void testPutShouldFailOnValidationError() {
        when(validator.validatePut(any())).thenReturn(INVALID_VALIDATION_RESULT);
        api.put(createDefaultModel());
    }

    @Test
    public void testPatchShouldSucceedOnValidationSuccess() {
        when(validator.validatePut(any())).thenReturn(ValidationResult.VALID);
        when(validator.validateDelete(any())).thenReturn(ValidationResult.VALID);
        api.patch(createDefaultModel().add(LBL_STMT1));

        Model model = ds.getNamedModel(GRAPH);
        assertTrue(model.contains(LBL_STMT1));
    }

    @Test(expected = ValidationException.class)
    public void patchShouldNotAcceptMachineOnlyTriples() {
        when(validator.validatePut(any())).thenReturn(INVALID_VALIDATION_RESULT);
        when(validator.validateDelete(any())).thenReturn(ValidationResult.VALID);
        api.patch(createDefaultModel());
    }

    @Test(expected = ValidationException.class)
    public void patchShouldNotDeleteMachineOnlyTriples() {
        when(validator.validatePut(any())).thenReturn(ValidationResult.VALID);
        when(validator.validateDelete(any())).thenReturn(INVALID_VALIDATION_RESULT);
        api.patch(createDefaultModel());
    }

    @Test
    public void testDeleteShouldSucceedOnValidationSuccess() {
        executeWrite(ds, () -> ds.getNamedModel(GRAPH).add(STMT1));

        when(validator.validateDelete(any())).thenReturn(ValidationResult.VALID);
        api.delete(S1.getURI(), null, null);

        Model model = ds.getNamedModel(GRAPH);
        assertTrue(!model.contains(LBL_STMT1));
    }

    @Test
    public void testDeleteModelShouldSucceedOnValidationSuccess() {
        executeWrite(ds, () -> ds.getNamedModel(GRAPH).add(STMT1));

        when(validator.validateDelete(any())).thenReturn(ValidationResult.VALID);
        api.delete(createDefaultModel().add(LBL_STMT1));

        Model model = ds.getNamedModel(GRAPH);
        assertFalse(model.contains(LBL_STMT1));
    }

    @Test(expected = ValidationException.class)
    public void deleteModelShouldNotAcceptMachineOnlyTriples() {
        when(validator.validateDelete(any())).thenReturn(INVALID_VALIDATION_RESULT);
        api.delete(createDefaultModel());
    }
}
