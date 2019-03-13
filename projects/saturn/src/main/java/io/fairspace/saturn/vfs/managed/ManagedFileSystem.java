package io.fairspace.saturn.vfs.managed;

import io.fairspace.saturn.rdf.QuerySolutionProcessor;
import io.fairspace.saturn.services.collections.Access;
import io.fairspace.saturn.services.collections.Collection;
import io.fairspace.saturn.services.collections.CollectionsService;
import io.fairspace.saturn.vfs.FileInfo;
import io.fairspace.saturn.vfs.VirtualFileSystem;
import lombok.SneakyThrows;
import lombok.Value;
import org.apache.commons.io.input.CountingInputStream;
import org.apache.commons.io.input.MessageDigestCalculatingInputStream;
import org.apache.jena.query.QuerySolution;
import org.apache.jena.rdfconnection.RDFConnection;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.AccessDeniedException;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.function.Supplier;

import static io.fairspace.saturn.commits.CommitMessages.withCommitMessage;
import static io.fairspace.saturn.rdf.SparqlUtils.parseXSDDateTime;
import static io.fairspace.saturn.rdf.SparqlUtils.storedQuery;
import static io.fairspace.saturn.vfs.PathUtils.*;
import static java.time.Instant.ofEpochMilli;
import static java.util.Collections.emptyList;
import static java.util.stream.Collectors.toList;
import static org.apache.commons.codec.binary.Hex.encodeHexString;

public class ManagedFileSystem implements VirtualFileSystem {
    private static final FileInfo ROOT = FileInfo.builder().path("")
            .readOnly(false)
            .isDirectory(true)
            .created(ofEpochMilli(0))
            .modified(ofEpochMilli(0))
            .build();
    private final RDFConnection rdf;
    private final BlobStore store;
    private final Supplier<String> userIriSupplier;
    private final CollectionsService collections;

    public ManagedFileSystem(RDFConnection rdf, BlobStore store, Supplier<String> userIriSupplier, CollectionsService collections) {
        this.rdf = rdf;
        this.store = store;
        this.userIriSupplier = userIriSupplier;
        this.collections = collections;
        collections.setOnLocationChangeListener((oldLocation, newLocation) ->
                rdf.update(storedQuery("fs_move", oldLocation, newLocation, "")));
    }

    @Override
    public FileInfo stat(String path) throws IOException {
        if (path.isEmpty()) {
            return ROOT;
        }

        if (isCollection(path)) {
            var collection = collections.getByLocation(path);
            if (collection == null) {
                return null;
            }
            return fileInfo(collection);
        }

        var access = getAccess(path);
        if (access == Access.None) {
            return null;
        }

        var processor = new QuerySolutionProcessor<>(row -> fileInfo(row, access.ordinal() < Access.Write.ordinal()));

        rdf.querySelect(storedQuery("fs_stat", path), processor);

        return processor.getSingle().orElse(null);
    }

    @Override
    public List<FileInfo> list(String parentPath) throws IOException {
        if (parentPath.isEmpty()) {
            return collections.list()
                    .stream()
                    .map(ManagedFileSystem::fileInfo)
                    .collect(toList());
        }

        var access = getAccess(parentPath);
        if (access == Access.None) {
            return emptyList();
        }

        var processor = new QuerySolutionProcessor<>(row -> fileInfo(row, access.ordinal() < Access.Write.ordinal()));
        rdf.querySelect(storedQuery("fs_ls", parentPath + '/'), processor);
        return processor.getValues();
    }

    @Override
    public void mkdir(String path) throws IOException {
        ensureValidPath(path);

        withCommitMessage("Create directory " + path,
                () -> rdf.update(storedQuery("fs_mkdir", path, userIriSupplier.get(), name(path))));
    }

    @Override
    public void create(String path, InputStream in) throws IOException {
        ensureValidPath(path);

        var blobInfo = write(in);
        withCommitMessage("Create file " + path, () ->
                rdf.update(storedQuery("fs_create", path, blobInfo.getSize(), blobInfo.getId(), userIriSupplier.get(), name(path), blobInfo.getMd5())));
    }

    @Override
    public void modify(String path, InputStream in) throws IOException {
        var blobInfo = write(in);

        withCommitMessage("Modify file " + path,
                () -> rdf.update(storedQuery("fs_modify", path, blobInfo.getSize(), blobInfo.getId(), userIriSupplier.get(), blobInfo.getMd5())));
    }

    @Override
    public void read(String path, OutputStream out) throws IOException {
        var processor = new QuerySolutionProcessor<>(row -> row.getLiteral("blobId").getString());
        rdf.querySelect(storedQuery("fs_get_blobid", path), processor);
        var blobId = processor.getSingle().orElseThrow(() -> new FileNotFoundException(path));
        store.read(blobId, out);
    }

    @Override
    public void copy(String from, String to) throws IOException {
        ensureValidPath(from);
        ensureValidPath(to);
        withCommitMessage("Copy data from " + from + " to " + to,
                () -> rdf.update(storedQuery("fs_copy", from, to, name(to))));
    }

    @Override
    public void move(String from, String to) throws IOException {
        ensureValidPath(from);
        ensureValidPath(to);
        withCommitMessage("Move data from " + from + " to " + to,
                () -> rdf.update(storedQuery("fs_move", from, to, name(to))));
    }

    @Override
    public void delete(String path) throws IOException {
        ensureValidPath(path);

        withCommitMessage("Delete " + path,
                () -> rdf.update(storedQuery("fs_delete", path, userIriSupplier.get())));
    }

    @Override
    public void close() throws IOException {

    }

    private static FileInfo fileInfo(QuerySolution row, boolean readOnly) {
        return FileInfo.builder()
                .iri(row.getResource("iri").getURI())
                .path(row.getLiteral("path").getString())
                .size(row.getLiteral("size").getLong())
                .isDirectory(!row.getLiteral("isDirectory").getBoolean())
                .created(parseXSDDateTime(row.getLiteral("created")))
                .modified(parseXSDDateTime(row.getLiteral("modified")))
                .createdBy(row.getLiteral("createdBy").getString())
                .modifiedBy(row.getLiteral("modifiedBy").getString())
                .readOnly(readOnly)
                .build();
    }

    private static FileInfo fileInfo(Collection collection) {
        return FileInfo.builder()
                .iri(collection.getIri().getURI())
                .path(collection.getLocation())
                .size(0)
                .isDirectory(true)
                .created(collection.getDateCreated())
                .modified(collection.getDateCreated())
                .createdBy(collection.getCreatedBy().getURI())
                .modifiedBy(collection.getModifiedBy().getURI())
                .readOnly(collection.getAccess().ordinal() < Access.Read.ordinal())
                .build();
    }

    static boolean isCollection(String path) {
        return !path.isEmpty() && splitPath(path).length == 1;
    }

    private static void ensureValidPath(String path) throws IOException {
        if (!path.equals(normalizePath(path))) {
            throw new AssertionError("Invalid path format: " + path);
        }
        if (path.isEmpty()) {
            throw new AccessDeniedException("File operations on the root directory are not allowed");
        }
        if (isCollection(path)) {
            throw new AccessDeniedException("Use Collections API for operations on collections");
        }
    }

    private Collection getCollection(String path) {
        return collections.getByLocation(splitPath(path)[0]);
    }

    private Access getAccess(String path) {
        var c = getCollection(path);
        return (c == null) ? Access.None : c.getAccess();
    }

    @SneakyThrows(NoSuchAlgorithmException.class)
    private BlobInfo write(InputStream in) throws IOException {
        var countingInputStream = new CountingInputStream(in);
        var messageDigestCalculatingInputStream = new MessageDigestCalculatingInputStream(countingInputStream);

        var id = store.write(messageDigestCalculatingInputStream);

        return new BlobInfo(id, countingInputStream.getByteCount(), encodeHexString(messageDigestCalculatingInputStream.getMessageDigest().digest()));
    }

    @Value
    private static class BlobInfo {
        String id;
        long size;
        String md5;
    }
}
