package io.fairspace.saturn.config;

import io.fairspace.saturn.services.features.FeaturesApp;
import io.fairspace.saturn.services.health.HealthApp;
import io.fairspace.saturn.services.metadata.MetadataApp;
import io.fairspace.saturn.services.metadata.VocabularyApp;
import io.fairspace.saturn.services.search.SearchApp;
import io.fairspace.saturn.services.services.ServicesApp;
import io.fairspace.saturn.services.users.*;
import io.fairspace.saturn.services.views.ViewApp;
import io.fairspace.saturn.services.workspaces.WorkspaceApp;

import javax.servlet.Filter;

public class SparkFilterFactory {
    public static Filter createSparkFilter(String apiPathPrefix, Services svc, Config config) {
        return new SaturnSparkFilter(
                new WorkspaceApp(apiPathPrefix + "/workspaces", svc.getWorkspaceService()),
                new MetadataApp(apiPathPrefix + "/metadata", svc.getMetadataService()),
                new ViewApp(apiPathPrefix + "/views", svc.getViewService(), svc.getQueryService()),
                new SearchApp(apiPathPrefix + "/search", svc.getSearchService(), svc.getQueryService()),
                new VocabularyApp(apiPathPrefix + "/vocabulary"),
                new UserApp(apiPathPrefix + "/users", svc.getUserService()),
                new ServicesApp(apiPathPrefix + "/services", config.services),
                new FeaturesApp(apiPathPrefix + "/features", config.features),
                new HealthApp(apiPathPrefix + "/health"),
                new LogoutApp("/logout", svc.getUserService(), config));
    }
}
