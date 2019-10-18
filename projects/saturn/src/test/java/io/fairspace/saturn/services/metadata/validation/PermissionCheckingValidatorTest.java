package io.fairspace.saturn.services.metadata.validation;

import io.fairspace.saturn.services.permissions.Access;
import io.fairspace.saturn.services.permissions.MetadataAccessDeniedException;
import io.fairspace.saturn.services.permissions.PermissionsService;
import org.apache.jena.graph.Node;
import org.apache.jena.rdf.model.Statement;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.Collections;
import java.util.Set;

import static io.fairspace.saturn.util.ModelUtils.EMPTY_MODEL;
import static io.fairspace.saturn.util.ModelUtils.modelOf;
import static org.apache.jena.rdf.model.ResourceFactory.*;
import static org.mockito.Mockito.*;

@RunWith(MockitoJUnitRunner.class)
public class PermissionCheckingValidatorTest {

    private static final Statement STATEMENT = createStatement(
            createResource("http://ex.com/subject"),
            createProperty("http://ex.com/predicate"), // does not have an inverse
            createResource("http://ex.com/object"));


    @Mock
    private PermissionsService permissions;

    @Mock
    private ViolationHandler violationHandler;


    private PermissionCheckingValidator validator;

    @Before
    public void setUp() {
        validator = new PermissionCheckingValidator(permissions);
    }

    @Test
    public void noChecksShouldBePerformedOnAnEmptyModel() {
        validator.validate(EMPTY_MODEL, EMPTY_MODEL, EMPTY_MODEL, EMPTY_MODEL, null, violationHandler, null);

        verify(permissions).ensureAccess(Collections.emptySet(), Access.Write);
        verifyZeroInteractions(violationHandler);
    }

    @Test
    public void noWritePermissionCausesAFailure() {
        var model = modelOf(STATEMENT);
        Set<Node> nodes = Set.of(STATEMENT.getSubject().asNode());

        doThrow(new MetadataAccessDeniedException("", STATEMENT.getSubject().asNode())).when(permissions).ensureAccess(nodes, Access.Write);
        validator.validate(EMPTY_MODEL, model, EMPTY_MODEL, model, null, violationHandler, null);
        verify(violationHandler).onViolation("Cannot modify read-only resource", STATEMENT.getSubject(), null, null);
    }

    @Test
    public void itShouldCheckPermissionsForSubject() {
        var model = modelOf(STATEMENT);
        Set<Node> nodes = Set.of(STATEMENT.getSubject().asNode());

        validator.validate(EMPTY_MODEL, model, EMPTY_MODEL, model, null, violationHandler, null);

        verifyZeroInteractions(violationHandler);
        verify(permissions).ensureAccess(nodes, Access.Write);

        verifyNoMoreInteractions(permissions);
    }
}
