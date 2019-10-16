package io.fairspace.saturn.services.collections;

import io.fairspace.saturn.events.CollectionEvent;
import io.fairspace.saturn.events.EventService;
import io.fairspace.saturn.rdf.dao.DAO;
import io.fairspace.saturn.rdf.transactions.TransactionalBatchExecutorService;
import io.fairspace.saturn.services.AccessDeniedException;
import io.fairspace.saturn.services.permissions.Access;
import io.fairspace.saturn.services.permissions.PermissionsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

import static io.fairspace.saturn.rdf.SparqlUtils.storedQuery;
import static io.fairspace.saturn.rdf.TransactionUtils.commit;
import static io.fairspace.saturn.util.ValidationUtils.validate;
import static io.fairspace.saturn.util.ValidationUtils.validateIRI;
import static java.util.Comparator.comparing;
import static java.util.stream.Collectors.toList;
import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotEmpty;
import static org.apache.jena.graph.NodeFactory.createURI;

@RequiredArgsConstructor
@Slf4j
public class CollectionsService {
    private final DAO dao;
    private final TransactionalBatchExecutorService executor;
    private final Consumer<Object> eventListener;
    private final PermissionsService permissions;
    private final EventService eventService;

    public Collection create(Collection collection) {
        validate(collection.getIri() == null, "Field iri must be left empty");
        if (isBlank(collection.getConnectionString())) {
            collection.setConnectionString("");
        }
        validateFields(collection);

        if (collection.getDescription() == null) {
            collection.setDescription("");
        }

        Collection storedCollection = commit("Create collection " + collection.getName(), executor, () -> {
            ensureLocationIsNotUsed(collection.getLocation());
            dao.write(collection);
            permissions.createResource(collection.getIri());
            collection.setAccess(Access.Manage);
            eventListener.accept(new CollectionCreatedEvent(collection));
            return collection;
        });

        eventService.emitEvent(CollectionEvent.builder()
                .eventType(CollectionEvent.Type.CREATED)
                .collection(getEventCollection(storedCollection))
                .build()
        );

        return storedCollection;
    }

    public Collection get(String iri) {
        return addPermissionsToObject(dao.read(Collection.class, createURI(iri)));
    }

    public Collection getByLocation(String location) {
        return getByLocationWithoutAccess(location)
                .map(this::addPermissionsToObject)
                .orElse(null);
    }

    private Optional<Collection> getByLocationWithoutAccess(String location) {
        return dao.construct(Collection.class, storedQuery("coll_get_by_dir", location))
                .stream()
                .findFirst();
    }

    private void ensureLocationIsNotUsed(String location) {
        if(getByLocationWithoutAccess(location).isPresent()) {
            throw new LocationAlreadyExistsException(location);
        }
    }

    public List<Collection> list() {
        var collections = dao.list(Collection.class);

        var iris = collections.stream().map(Collection::getIri).collect(toList());
        var userPermissions = permissions.getPermissions(iris);

        List<Collection> collectionList = collections.stream()
                .filter(c -> {
                    c.setAccess(userPermissions.get(c.getIri()));
                    return c.canRead();
                })
                .sorted(comparing(Collection::getName))
                .collect(toList());

        eventService.emitEvent(CollectionEvent.builder()
                .eventType(CollectionEvent.Type.LISTED)
                .build()
        );

        return collectionList;
    }

    public void delete(String iri) {
        validateIRI(iri);
        commit("Delete collection " + iri, executor, () -> {
            var collection = get(iri);
            if (collection == null) {
                log.info("Collection not found {}", iri);
                throw new CollectionNotFoundException(iri);
            }
            if (!collection.getAccess().canManage()) {
                log.info("No enough permissions to delete a collection {}", iri);
                throw new AccessDeniedException("Insufficient permissions for collection " + iri);
            }

            dao.markAsDeleted(collection);

            // Emit event on internal eventbus so the filesystem can act accordingly
            eventListener.accept(new CollectionDeletedEvent(collection));

            // Emit event on external eventbus for logging purposes
            eventService.emitEvent(CollectionEvent.builder()
                    .eventType(CollectionEvent.Type.DELETED)
                    .collection(getEventCollection(collection))
                    .build()
            );
        });
    }

    public Collection update(Collection patch) {
        validate(patch.getIri() != null, "No IRI");

        validateIRI(patch.getIri().getURI());

        return commit("Update collection " + patch.getName(), executor, () -> {
            var collection = get(patch.getIri().getURI());
            if (collection == null) {
                log.info("Collection not found {}", patch.getIri());
                throw new CollectionNotFoundException(patch.getIri().getURI());
            }
            if (!collection.getAccess().canWrite()) {
                log.info("No enough permissions to modify a collection {}", patch.getIri());
                throw new AccessDeniedException("Insufficient permissions for collection " + patch.getIri().getURI());
            }

            var oldLocation = collection.getLocation();
            if (patch.getLocation() != null && !patch.getLocation().equals(collection.getLocation())) {
                ensureLocationIsNotUsed(patch.getLocation());
                collection.setLocation(patch.getLocation());
            }

            if (patch.getConnectionString() != null) {
                collection.setConnectionString(patch.getConnectionString());
            }

            if (patch.getName() != null) {
                collection.setName(patch.getName());
            }

            if (patch.getDescription() != null) {
                collection.setDescription(patch.getDescription());
            }

            validateFields(collection);
            collection = dao.write(collection);

            CollectionEvent.Type eventType;
            if (!collection.getLocation().equals(oldLocation)) {
                eventListener.accept(new CollectionMovedEvent(collection, oldLocation));
                eventType = CollectionEvent.Type.MOVED;
            } else {
                eventType = CollectionEvent.Type.UPDATED;
            }

            // Emit event on external eventbus for logging purposes
            eventService.emitEvent(CollectionEvent.builder()
                    .eventType(eventType)
                    .collection(getEventCollection(collection))
                    .build()
            );

            return collection;
        });
    }

    private void validateFields(Collection collection) {
        validate(isLocationValid(collection.getLocation()), "Invalid location");
        validate(isNotEmpty(collection.getName()), "Field name must be set");
        validate(collection.getName().length() <= 128, "Field name must contain no more than 128 characters");
        validate(collection.getConnectionString() != null, "Field type must be set");
    }

    private Collection addPermissionsToObject(Collection c) {
        if (c != null) {
            c.setAccess(permissions.getPermission(c.getIri()));
            if(c.getAccess() == Access.None) {
                return null;
            }
        }
        return c;
    }

    private static boolean isLocationValid(String name) {
        return name.matches("[A-Za-z0-9_-]+")
                && !name.isEmpty()
                && name.length() < 128;
    }

    private CollectionEvent.Collection getEventCollection(Collection collection) {
        return new CollectionEvent.Collection(collection.getIri().toString(), collection.getName());
    }

}
