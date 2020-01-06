package io.fairspace.saturn.rdf;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import io.fairspace.saturn.config.Config;
import io.fairspace.saturn.rdf.search.ElasticSearchClientFactory;
import org.apache.jena.sparql.core.DatasetGraph;
import org.apache.jena.sparql.core.DatasetGraphWrapper;
import org.apache.jena.sparql.util.Context;
import org.elasticsearch.client.Client;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

import static io.fairspace.saturn.ThreadContext.getThreadContext;

public class DatasetGraphMulti extends DatasetGraphWrapper {
    private final LoadingCache<String, DatasetGraph> cache;
    private final Client client;

    public DatasetGraphMulti(Config.Jena config) {
        super(null);

        client = config.elasticSearch.enabled
                ? ElasticSearchClientFactory.build(config.elasticSearch.settings, config.elasticSearch.advancedSettings)
                : null;

        cache = CacheBuilder.newBuilder()
                .expireAfterAccess(config.inactiveConnectionShutdownIntervalSec, TimeUnit.SECONDS)
                .removalListener(notification -> ((DatasetGraph) notification.getValue()).close())
                .build(new CacheLoader<>() {
                    public DatasetGraph load(String projectName) throws Exception {
                        return SaturnDatasetFactory.connect(config, projectName, client);
                    }
                });
    }

    @Override
    protected DatasetGraph get() {
        try {
            return cache.get(getThreadContext().getProject());
        } catch (ExecutionException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public Context getContext() {
        return Context.emptyContext;
    }

    @Override
    public void close() {
        cache.cleanUp();
        if (client != null) {
            client.close();
        }
    }

    @Override
    protected Context getCxt() {
        return super.getCxt();
    }

    @Override
    public boolean supportsTransactions() {
        return true;
    }

    @Override
    public boolean supportsTransactionAbort() {
        return true;
    }

    @Override
    public String toString() {
        return "Multi graph, current = " + getThreadContext().getProject();
    }
}