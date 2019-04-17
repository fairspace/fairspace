package io.fairspace.saturn;


import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.apache.jena.query.text.es.ESSettings;

import java.io.File;
import java.util.HashSet;
import java.util.Properties;
import java.util.Set;

public class Config {
    public int port = 8080;

    public final Jena jena = new Jena();

    public final Auth auth = new Auth();

    public final WebDAV webDAV = new WebDAV();

    public final Properties mail = new Properties();

    public static class Jena {
        public String metadataBaseIRI = "http://localhost/iri/";
        public String vocabularyBaseIRI = "http://localhost/vocabulary/";

        public File datasetPath = new File("data/db");

        public File transactionLogPath = new File("data/log");

        public ElasticSearch elasticSearch = new ElasticSearch();

        public static class ElasticSearch {
            public boolean enabled = false;
            public boolean required = false;
            public ESSettings settings = new ESSettings.Builder()
                    .clusterName("fairspace")
                    .hostAndPort("127.0.0.1", 9300)
                    .build();
        }
    }

    public static class Auth {
        public boolean enabled = false;

        public final Set<String> developerRoles = new HashSet<>();

        public String jwksUrl = "https://keycloak.hyperspace.ci.fairway.app/auth/realms/ci/protocol/openid-connect/certs";

        public String jwtAlgorithm = "RS256";

        public String dataStewardRole = "datasteward";
    }

    public static class WebDAV {
        public String blobStorePath = "data/blobs";
    }

    @Override
    public String toString() {
        try {
            return new ObjectMapper(new YAMLFactory()).writeValueAsString(this);
        } catch (JsonProcessingException e) {
            return super.toString();
        }
    }
}
