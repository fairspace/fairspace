package io.fairspace.saturn.services.metadata.validation;

import org.apache.jena.graph.Node;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.impl.ResourceImpl;
import org.apache.jena.shacl.Shapes;
import org.apache.jena.shacl.engine.TargetType;
import org.apache.jena.shacl.engine.ValidationContext;
import org.apache.jena.shacl.parser.Shape;
import org.apache.jena.shacl.vocabulary.SHACL;
import org.apache.jena.sparql.path.P_Link;

import static io.fairspace.saturn.rdf.ModelUtils.getType;
import static org.apache.jena.rdf.model.ResourceFactory.createProperty;
import static org.apache.jena.shacl.validation.ValidationProc.execValidateShape;

public class ShaclValidator implements MetadataRequestValidator {
    @Override
    public void validate(Model before, Model after, Model removed, Model added, Model vocabulary, ViolationHandler violationHandler) {
        var affected = removed.listSubjects()
                .filterKeep(after::containsResource)
                .andThen(added.listSubjects())
                .mapWith(resource -> resource.inModel(after))
                .toSet();

        if (affected.isEmpty()) {
            return;
        }

        var vCxt = new ValidationContext(Shapes.parse(vocabulary.getGraph()), after.getGraph());

        affected.forEach(resource -> {
            var typeResource = getType(resource);
            if (typeResource != null) {
                var type = typeResource.asNode();
                vCxt.getShapes().forEach(shape -> {
                    if (isTarget(shape, type)) {
                        execValidateShape(vCxt, after.getGraph(), shape, resource.asNode());
                    }
                });
            }
        });

        vCxt.generateReport()
                .getEntries()
                .forEach(entry -> {
                    if (entry.severity().level() == SHACL.Violation) {
                        var subject = new ResourceImpl(entry.focusNode(), null);
                        var predicate = (entry.resultPath() instanceof P_Link)
                                ? createProperty(((P_Link)entry.resultPath()).getNode().getURI())
                                : null;
                        var object = entry.value() != null
                                ? before.asRDFNode(entry.value())
                                : null;
                        violationHandler.onViolation(entry.message(), subject, predicate, object);
                    }
                });
    }

    private static boolean isTarget(Shape shape, Node type) {
        // TODO: Support other target types
        return shape.getTargets()
                .stream()
                .filter(t -> t.getTargetType() == TargetType.targetClass)
                .anyMatch(t -> type.equals(t.getObject()));
    }
}
