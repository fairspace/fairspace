package io.fairspace.saturn.config;

import io.fairspace.saturn.rdf.search.FilteredDatasetGraph;
import io.fairspace.saturn.rdf.search.IndexDispatcher;
import io.fairspace.saturn.rdf.transactions.BulkTransactions;
import io.fairspace.saturn.rdf.transactions.SimpleTransactions;
import io.fairspace.saturn.rdf.transactions.Transactions;
import io.fairspace.saturn.services.mail.MailService;
import io.fairspace.saturn.services.metadata.MetadataPermissions;
import io.fairspace.saturn.services.metadata.MetadataService;
import io.fairspace.saturn.services.metadata.validation.*;
import io.fairspace.saturn.services.users.UserService;
import io.fairspace.saturn.services.views.*;
import io.fairspace.saturn.services.workspaces.WorkspaceService;
import io.fairspace.saturn.webdav.BlobStore;
import io.fairspace.saturn.webdav.DavFactory;
import io.fairspace.saturn.webdav.LocalBlobStore;
import io.fairspace.saturn.webdav.WebDAVServlet;
import lombok.Getter;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.apache.jena.query.Dataset;
import org.apache.jena.sparql.util.Symbol;

import javax.servlet.http.HttpServlet;
import java.io.File;

import static io.fairspace.saturn.config.ConfigLoader.CONFIG;
import static io.fairspace.saturn.vocabulary.Vocabularies.VOCABULARY;

@Slf4j
@Getter
public class Services {
    public static final Symbol FS_ROOT = Symbol.create("file_system_root");
    public static final Symbol USER_SERVICE = Symbol.create("user_service");
    public static final Symbol METADATA_SERVICE = Symbol.create("metadata_service");

    private final Config config;
    private final Transactions transactions;

    private final WorkspaceService workspaceService;
    private final UserService userService;
    private final MailService mailService;
    private final MetadataPermissions metadataPermissions;
    private final MetadataService metadataService;
    private final ViewService viewService;
    private final BlobStore blobStore;
    private final DavFactory davFactory;
    private final HttpServlet davServlet;
    private final FilteredDatasetGraph filteredDatasetGraph;
    private final SearchProxyServlet searchProxyServlet;

    public Services(@NonNull String apiPrefix, @NonNull Config config, @NonNull Dataset dataset, ViewStoreClient viewStoreClient) {
        this.config = config;
        this.transactions = config.jena.bulkTransactions ? new BulkTransactions(dataset) : new SimpleTransactions(dataset);

        userService = new UserService(config.auth, transactions);
        dataset.getContext().set(USER_SERVICE, userService);

        mailService = new MailService(config.mail);
        blobStore = new LocalBlobStore(new File(config.webDAV.blobStorePath));
        davFactory = new DavFactory(dataset.getDefaultModel().createResource(CONFIG.publicUrl + "/api/v1/webdav"), blobStore, userService, mailService, dataset.getContext());
        dataset.getContext().set(FS_ROOT, davFactory.root);
        davServlet = new WebDAVServlet(davFactory, transactions, blobStore);

        workspaceService = new WorkspaceService(transactions, userService, mailService);

        metadataPermissions = new MetadataPermissions(workspaceService, davFactory, userService);

        var metadataValidator = new ComposedValidator(
                new MachineOnlyClassesValidator(VOCABULARY),
                new ProtectMachineOnlyPredicatesValidator(VOCABULARY),
                new PermissionCheckingValidator(metadataPermissions),
                new DeletionValidator(),
                new UniqueLabelValidator(),
                new ShaclValidator(VOCABULARY));

        metadataService = new MetadataService(transactions, VOCABULARY, metadataValidator);
        dataset.getContext().set(METADATA_SERVICE, metadataService);

        viewService = viewStoreClient == null ? null : new ViewService(viewStoreClient);

        filteredDatasetGraph = new FilteredDatasetGraph(dataset.asDatasetGraph(), metadataPermissions);

        searchProxyServlet = new SearchProxyServlet(
                apiPrefix,
                CONFIG.elasticsearchUrl,
                transactions,
                new IndexDispatcher(dataset.getContext()));
    }
}
