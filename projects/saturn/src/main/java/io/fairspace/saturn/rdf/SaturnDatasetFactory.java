package io.fairspace.saturn.rdf;

import io.fairspace.oidc_auth.model.OAuthAuthenticationToken;
import io.fairspace.saturn.commits.CommitMessages;
import io.fairspace.saturn.config.Config;
import io.fairspace.saturn.rdf.search.*;
import io.fairspace.saturn.rdf.transactions.LocalTransactionLog;
import io.fairspace.saturn.rdf.transactions.SparqlTransactionCodec;
import io.fairspace.saturn.rdf.transactions.TxnLogDatasetGraph;
import lombok.extern.slf4j.Slf4j;
import org.apache.jena.query.Dataset;
import org.apache.jena.query.DatasetFactory;
import org.apache.jena.query.text.TextDatasetFactory;
import org.apache.jena.query.text.TextIndexConfig;
import org.apache.jena.sparql.core.DatasetGraph;
import org.elasticsearch.client.Client;

import java.io.File;
import java.io.IOException;
import java.net.UnknownHostException;
import java.util.function.Supplier;

import static io.fairspace.saturn.rdf.transactions.Restore.restore;
import static org.apache.jena.tdb2.DatabaseMgr.connectDatasetGraph;

@Slf4j
public class SaturnDatasetFactory {
    /**
     * Returns a dataset to work with.
     * We're playing Russian dolls here.
     * The original TDB2 dataset graph, which in fact consists of a number of wrappers itself (Jena uses wrappers everywhere),
     * is wrapped with a number of wrapper classes, each adding a new feature.
     * Currently it adds transaction logging, ElasticSearch indexing (if enabled) and applies default vocabulary if needed.
     */
    public static Dataset connect(Config.Jena config, String databaseName, Supplier<OAuthAuthenticationToken> userInfoSupplier) throws IOException {
        var dsDir = new File(config.datasetPath, databaseName);
        var restoreNeeded = isRestoreNeeded(dsDir);

        // Create a TDB2 dataset graph
        var dsg = connectDatasetGraph(dsDir.getAbsolutePath());

        var txnLog = new LocalTransactionLog(new File(config.transactionLogPath, databaseName), new SparqlTransactionCodec());

        if (config.elasticSearch.enabled) {
            // When a restore is needed, we instruct ES to delete the index first
            // This way, the index will be in sync with our current database
            dsg = enableElasticSearch(dsg, databaseName, config, restoreNeeded);
        }

        if (restoreNeeded) {
            restore(dsg, txnLog);
        }

        // Add transaction log
        dsg = new TxnLogDatasetGraph(dsg, txnLog, userInfoSupplier, CommitMessages::getCommitMessage);

        // Create a dataset
        return DatasetFactory.wrap(dsg);
    }

    protected static boolean isRestoreNeeded(File datasetPath) {
        return !datasetPath.exists() || datasetPath.list((dir, name) -> name.startsWith("Data-")).length == 0;
    }

    private static DatasetGraph enableElasticSearch(DatasetGraph dsg, String databaseName, Config.Jena config, boolean recreateIndex) throws UnknownHostException {
        Client client = null;
        try {
            // Setup ES client and index
            client = ElasticSearchClientFactory.build(config.elasticSearch.settings, config.elasticSearch.advancedSettings);
            ElasticSearchIndexConfigurer.configure(client, config.elasticSearch.settings, recreateIndex);

            // Create a dataset graph that updates ES with every triple update
            var textIndex = new TextIndexESBulk(new TextIndexConfig(new AutoEntityDefinition()), client, databaseName);
            var textDocProducer = new SingleTripleTextDocProducer(textIndex, !config.elasticSearch.required);
            return TextDatasetFactory.create(dsg, textIndex, true, textDocProducer);
        } catch (Exception e) {
            log.error("Error connecting to ElasticSearch", e);
            if (config.elasticSearch.required) {
                throw e; // Terminates Saturn
            }
            if (client != null) {
                client.close();
            }
            return dsg;
        }
    }
}
