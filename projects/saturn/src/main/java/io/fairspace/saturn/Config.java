package io.fairspace.saturn;


import java.io.File;
import java.net.URL;

public class Config {
    public String baseURI;

    public int port;

    public Jena jena;

    public Auth auth;

    public WebDAV webDAV;

    public static class Jena {
        public String datasetPath;

        public String transactionLogPath;

        public String vocabularyURI;
    }

     public static class Auth {
        public boolean authEnabled;

        public URL jwksUrl;

        public String jwtAlgorithm;
    }

    public static class WebDAV {
        public File blobStorePath;
    }
}
