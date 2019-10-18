package io.fairspace.saturn.services.metadata.validation;

import io.fairspace.saturn.vocabulary.FS;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdfconnection.RDFConnection;
import org.apache.jena.vocabulary.RDF;
import org.topbraid.shacl.vocabulary.SH;

public class MachineOnlyClassesValidator implements MetadataRequestValidator {

    public MachineOnlyClassesValidator() {
    }

    @Override
    public void validate(Model before, Model after, Model removed, Model added, Model vocabulary, ViolationHandler violationHandler, RDFConnection rdf) {
        vocabulary.listSubjectsWithProperty(SH.targetClass)
                .filterKeep(shape -> shape.hasLiteral(FS.machineOnly, true))
                .mapWith(shape -> shape.getPropertyResourceValue(SH.targetClass))
                .forEachRemaining(moc -> {
                    added.listStatements(null, RDF.type, moc)
                            .forEachRemaining(statement -> violationHandler.onViolation("Trying to create a machine-only entity", statement));
                    removed.listStatements(null, RDF.type, moc)
                            .forEachRemaining(statement -> violationHandler.onViolation("Trying to change type of a machine-only entity", statement));
                });
    }

}
