package io.fairspace.saturn.rdf;

import java.io.File;

import io.fairspace.saturn.config.properties.JenaProperties;
import lombok.extern.log4j.*;
import org.apache.jena.datatypes.TypeMapper;
import org.apache.jena.dboe.base.file.Location;
import org.apache.jena.query.Dataset;
import org.apache.jena.query.DatasetFactory;

import io.fairspace.saturn.config.*;
import io.fairspace.saturn.rdf.transactions.*;
import io.fairspace.saturn.services.views.*;

import static io.fairspace.saturn.rdf.MarkdownDataType.MARKDOWN_DATA_TYPE;
import static io.fairspace.saturn.rdf.transactions.Restore.restore;

import static org.apache.jena.tdb2.sys.DatabaseConnection.connectCreate;

@Log4j2
public class SaturnDatasetFactory {
    /**
     * Returns a dataset to work with.
     * We're playing Russian dolls here.
     * The original TDB2 dataset graph, which in fact consists of a number of wrappers itself (Jena uses wrappers everywhere),
     * is wrapped with a number of wrapper classes, each adding a new feature.
     * Currently it adds transaction logging and applies default vocabulary if needed.
     */
    public static Dataset connect(JenaProperties jenaProperties, ViewStoreClientFactory viewStoreClientFactory, String publicUrl) {
        var restoreNeeded = isRestoreNeeded(jenaProperties.getDatasetPath());

        // Create a TDB2 dataset graph
        var dsg = connectCreate(Location.create(jenaProperties.getDatasetPath().getAbsolutePath()), jenaProperties.getStoreParams(), null)
                .getDatasetGraph();

        var txnLog = new LocalTransactionLog(jenaProperties.getTransactionLogPath(), new SparqlTransactionCodec());

        if (viewStoreClientFactory != null) {
            dsg = new TxnIndexDatasetGraph(dsg, viewStoreClientFactory, publicUrl);
        }

        if (restoreNeeded) {
            restore(dsg, txnLog);
        }

        // Add transaction log
        dsg = new TxnLogDatasetGraph(dsg, txnLog);

        TypeMapper.getInstance().registerDatatype(MARKDOWN_DATA_TYPE);

        return DatasetFactory.wrap(dsg);
    }

    protected static boolean isRestoreNeeded(File datasetPath) {
        return !datasetPath.exists() || datasetPath.list((dir, name) -> name.startsWith("Data-")).length == 0;
    }
}
