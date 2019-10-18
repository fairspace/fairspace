package io.fairspace.saturn.services.permissions;

import io.fairspace.saturn.rdf.transactions.RDFLink;
import io.fairspace.saturn.services.mail.MailService;
import io.fairspace.saturn.services.users.User;
import io.fairspace.saturn.services.users.UserService;
import io.fairspace.saturn.vocabulary.FS;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.jena.graph.Node;
import org.apache.jena.vocabulary.RDFS;

import javax.mail.Message;
import javax.mail.internet.InternetAddress;
import java.util.Optional;

import static io.fairspace.saturn.rdf.SparqlUtils.storedQuery;
import static org.apache.jena.sparql.core.Quad.defaultGraphIRI;

/**
 * Sends an email to a user that gets access to a certain resource
 */
@AllArgsConstructor
@Slf4j
public class PermissionNotificationHandler implements PermissionChangeEventHandler {
    private final RDFLink rdfLink;
    private final UserService userService;
    private final MailService mailService;
    private final String publicUrl;

    public void onPermissionChange(Node currentUser, Node resource, Node user, Access access) {
        Optional.ofNullable(userService.getUser(user))
                .map(User::getEmail)
                .ifPresent(email -> {
                    try {
                        var msg = mailService.newMessage();
                        msg.setRecipient(Message.RecipientType.TO, new InternetAddress(email));
                        msg.setSubject("Your access permissions changed");
                        msg.setText("Your access level for " +
                                (isCollection(resource)
                                        ? "collection " + getLabel(resource) + " (" + getCollectionUrl(resource) + ")"
                                        : "resource " + getLabel(resource) + " (" + resource.getURI() + ")") +
                                " was set to " + access + " by " + userService.getUser(currentUser).getName() + ".");
                        mailService.send(msg);
                    } catch (Exception e) {
                        log.error("Error sending an email", e);
                    }
                });
    }

    /**
     * Returns the public url where this collection can be accessed
     *
     * @param collection
     * @return
     */
    private String getCollectionUrl(Node collection) {
        return String.format("%s/collections/%s", publicUrl, getLocation(collection));
    }

    private boolean isCollection(Node resource) {
        return rdfLink.calculateRead(rdf -> rdf.queryAsk(storedQuery("is_collection", resource)));
    }

    private String getLabel(Node node) {
        var stmts = rdfLink.calculateRead(rdf -> rdf.queryConstruct(storedQuery("select_by_mask", defaultGraphIRI, node, RDFS.label, null)).listStatements());
        return stmts.hasNext() ? stmts.nextStatement().getString() : "";
    }

    private String getLocation(Node collection) {
        var stmts = rdfLink.calculateRead(rdf -> rdf.queryConstruct(storedQuery("select_by_mask", defaultGraphIRI, collection, FS.filePath, null)).listStatements());
        return stmts.hasNext() ? stmts.nextStatement().getString() : "";
    }
}

