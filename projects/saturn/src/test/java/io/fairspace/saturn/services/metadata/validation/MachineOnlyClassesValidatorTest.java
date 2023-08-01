package io.fairspace.saturn.services.metadata.validation;

import io.fairspace.saturn.vocabulary.FS;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.shacl.vocabulary.SHACLM;
import org.apache.jena.vocabulary.RDF;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import static io.fairspace.saturn.rdf.ModelUtils.EMPTY_MODEL;
import static io.fairspace.saturn.rdf.ModelUtils.modelOf;
import static org.apache.jena.rdf.model.ResourceFactory.*;
import static org.mockito.Mockito.*;

@RunWith(MockitoJUnitRunner.class)
public class MachineOnlyClassesValidatorTest {
    private static final Resource machineOnlyClass = createResource("http://example.com/MachineOnly");
    private static final Resource regularClass = createResource("http://example.com/Regular");
    private static final Resource machineOnlyInstance = createResource("http://example.com/123");
    private static final Resource regularInstance = createResource("http://example.com/345");
    private static final Model vocabulary = modelOf(
            regularClass, RDF.type, SHACLM.NodeShape,
            machineOnlyClass, RDF.type, SHACLM.NodeShape,
            machineOnlyClass, FS.machineOnly, createTypedLiteral(true));

    private MachineOnlyClassesValidator validator = new MachineOnlyClassesValidator(vocabulary);

    @Mock
    private ViolationHandler violationHandler;

    @Test
    public void machineOnlyClassesCannotBeInstantiated() {
        var model = modelOf(machineOnlyInstance, RDF.type, machineOnlyClass);
        validator.validate(EMPTY_MODEL, model, EMPTY_MODEL, model, violationHandler);

        verify(violationHandler).onViolation("Trying to create a machine-only entity", createStatement(machineOnlyInstance, RDF.type, machineOnlyClass));
        verifyNoMoreInteractions(violationHandler);
    }

    @Test
    public void regularClassesCanBeInstantiated() {
        var model = modelOf(regularInstance, RDF.type, regularClass);
        validator.validate(EMPTY_MODEL, model, EMPTY_MODEL, model, violationHandler);

        verifyNoInteractions(violationHandler);
    }

    @Test
    public void machineOnlyClassesCannotBeRemoved() {
        var model = modelOf(machineOnlyInstance, RDF.type, machineOnlyClass);
        validator.validate(model, EMPTY_MODEL, model, EMPTY_MODEL, violationHandler);

        verify(violationHandler).onViolation("Trying to change type of a machine-only entity", createStatement(machineOnlyInstance, RDF.type, machineOnlyClass));
        verifyNoMoreInteractions(violationHandler);
    }

    @Test
    public void regularClassesCannotBeRemoved() {
        var model = modelOf(regularInstance, RDF.type, regularClass);
        validator.validate(model, EMPTY_MODEL, model, EMPTY_MODEL, violationHandler);

        verifyNoInteractions(violationHandler);
    }
}