package io.fairspace.saturn.services.metadata.validation;

import io.fairspace.saturn.rdf.Vocabulary;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.vocabulary.RDF;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.apache.jena.rdf.model.ModelFactory.createDefaultModel;
import static org.apache.jena.rdf.model.ResourceFactory.createProperty;
import static org.apache.jena.rdf.model.ResourceFactory.createResource;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.when;

@RunWith(MockitoJUnitRunner.class)
public class ProtectMachineOnlyPredicatesValidatorTest {
    private static final Property MACHINE_ONLY_PROPERTY = createProperty("http://fairspace.io/ontology#filePath");
    private static final Resource S1 = createResource("http://fairspace.io/iri/S1");
    private static final Resource S2 = createResource("http://fairspace.io/iri/S2");
    private static final Resource S3 = createResource("http://fairspace.io/iri/S3");
    private static final Property P1 = createProperty("http://fairspace.io/ontology/P1");
    private static final Property P2 = createProperty("http://fairspace.io/ontology/P2");

    @Mock
    private Vocabulary vocabulary;

    private ProtectMachineOnlyPredicatesValidator validator;

    @Before
    public void setUp() throws Exception {
        validator = new ProtectMachineOnlyPredicatesValidator(vocabulary);
    }

    @Test
    public void testContainsMachineOnlyPredicates() {
        List<String> machineOnlyPredicates = Arrays.asList(MACHINE_ONLY_PROPERTY.getURI(), P1.getURI());
        when(vocabulary.getMachineOnlyPredicates()).thenReturn(machineOnlyPredicates);

        // An empty model should pass
        Model testModel = createDefaultModel();
        assertFalse(validator.containsMachineOnlyPredicates(testModel));

        // A machine-only property may be used as subject or object
        testModel.add(P1, RDF.type, RDF.Property);
        testModel.add(MACHINE_ONLY_PROPERTY, RDF.value, P1);

        // Other statements are allowed as well
        testModel.add(S1, P2, S2);
        testModel.add(S2, P2, S1);

        assertFalse(validator.containsMachineOnlyPredicates(testModel));
    }

    @Test
    public void testHasMachineOnlyPredicatesRecognizesMachineOnlyStatements() {
        List<String> machineOnlyPredicates = Arrays.asList(MACHINE_ONLY_PROPERTY.getURI(), P1.getURI());
        when(vocabulary.getMachineOnlyPredicates()).thenReturn(machineOnlyPredicates);

        // Create a model that contains one machine only statement between several non-machine-only
        Model testModel = createDefaultModel();
        testModel.add(S1, P2, S2);
        testModel.add(S2, P2, S1);
        testModel.add(S3, P2, S1);

        testModel.add(S3, MACHINE_ONLY_PROPERTY, S1);

        testModel.add(S2, P2, S3);
        testModel.add(S1, P2, S3);
        testModel.add(S3, P2, S2);

        assertTrue(validator.containsMachineOnlyPredicates(testModel));
    }

    @Test
    public void testHasMachineOnlyPredicatesOnEmptyVocabulary() {
        when(vocabulary.getMachineOnlyPredicates()).thenReturn(Collections.emptyList());

        // Create a model that contains one machine only statement between several non-machine-only
        Model testModel = createDefaultModel();
        testModel.add(S1, P2, S2);
        testModel.add(S2, P2, S1);
        testModel.add(S3, P2, S1);

        testModel.add(S3, MACHINE_ONLY_PROPERTY, S1);

        testModel.add(S2, P2, S3);
        testModel.add(S1, P2, S3);
        testModel.add(S3, P2, S2);

        assertFalse(validator.containsMachineOnlyPredicates(testModel));
    }

    @Test
    public void testHasMachineOnlyPredicatesOnEmptyModel() {
        assertFalse(validator.containsMachineOnlyPredicates(createDefaultModel()));
        assertFalse(validator.containsMachineOnlyPredicates(null));
    }

}
