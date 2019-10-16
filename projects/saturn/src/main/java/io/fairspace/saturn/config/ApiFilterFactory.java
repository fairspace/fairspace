package io.fairspace.saturn.config;

import io.fairspace.saturn.services.collections.CollectionsApp;
import io.fairspace.saturn.services.health.HealthApp;
import io.fairspace.saturn.services.metadata.ChangeableMetadataApp;
import io.fairspace.saturn.services.metadata.ReadableMetadataApp;
import io.fairspace.saturn.services.permissions.PermissionsApp;
import io.fairspace.saturn.services.users.UserApp;

import javax.servlet.Filter;

public class ApiFilterFactory {
    public static Filter createApiFilter(String apiPathPrefix, Services svc, Config config) {
        return new SaturnSparkFilter(apiPathPrefix,
                new ChangeableMetadataApp("/metadata", svc.getMetadataService(), svc.getTransactionalBatchExecutorService(), config.jena.metadataBaseIRI),
                new ChangeableMetadataApp("/vocabulary", svc.getUserVocabularyService(), svc.getTransactionalBatchExecutorService(), config.jena.vocabularyBaseIRI),
                new ReadableMetadataApp("/meta-vocabulary", svc.getMetaVocabularyService()),
                new CollectionsApp("/collections", svc.getCollectionsService()),
                new PermissionsApp("/permissions", svc.getPermissionsService()),
                new UserApp("/users", svc.getUserService()),
                new HealthApp("/health"));
    }
}
