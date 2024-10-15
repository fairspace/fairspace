package io.fairspace.saturn.config;

import java.io.File;
import java.util.Arrays;

import org.apache.jena.query.Dataset;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.firewall.StrictHttpFirewall;

import io.fairspace.saturn.config.properties.WebDavProperties;
import io.fairspace.saturn.rdf.transactions.Transactions;
import io.fairspace.saturn.services.users.UserService;
import io.fairspace.saturn.webdav.DavFactory;
import io.fairspace.saturn.webdav.WebDAVServlet;
import io.fairspace.saturn.webdav.blobstore.BlobStore;
import io.fairspace.saturn.webdav.blobstore.LocalBlobStore;

@Configuration
public class WebDAVConfig {

    public static final String WEB_DAV_URL_PATH = "/api/webdav";

    @Value("${application.publicUrl}")
    private String publicUrl;

    @Bean
    @Qualifier("webDavServletRegistrationBean")
    public ServletRegistrationBean<WebDAVServlet> getWebDavServletRegistrationBean(
            @Qualifier("webDavServlet") WebDAVServlet webDavServlet) {
        return new ServletRegistrationBean<>(webDavServlet, "/webdav/*");
    }

    @Bean
    @Qualifier("blobStore")
    public BlobStore getBlobStore(WebDavProperties webDavProperties) {
        return new LocalBlobStore(new File(webDavProperties.getBlobStorePath()));
    }

    @Bean
    @Qualifier("davFactory")
    public DavFactory getDavFactory(
            @Qualifier("dataset") Dataset dataset,
            @Qualifier("blobStore") BlobStore blobStore,
            UserService userService,
            WebDavProperties webDavProperties) {
        return new DavFactory(
                dataset.getDefaultModel().createResource(publicUrl + WEB_DAV_URL_PATH),
                blobStore,
                userService,
                dataset.getContext(),
                webDavProperties);
    }

    @Bean
    @Qualifier("webDavServlet")
    public WebDAVServlet getWebDavServlet(
            @Qualifier("davFactory") DavFactory davFactory,
            Transactions transactions,
            @Qualifier("blobStore") BlobStore blobStore) {
        return new WebDAVServlet(davFactory, transactions, blobStore);
    }

    /**
     * Configure the firewall to allow WebDAV methods.
     * By default, Spring Security blocks all methods except GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS, and TRACE.
     *
     * @return the firewall
     */
    @Bean
    public StrictHttpFirewall webDavFilterFirewall() {
        final StrictHttpFirewall firewall = new StrictHttpFirewall();
        firewall.setAllowedHttpMethods(
                Arrays.stream(ExtendedHttpMethod.values()).map(Enum::name).toList());
        return firewall;
    }

    private enum ExtendedHttpMethod {
        GET,
        HEAD,
        POST,
        PUT,
        PATCH,
        DELETE,
        OPTIONS,
        TRACE,
        COPY,
        LOCK,
        MKCOL,
        MOVE,
        PROPFIND,
        PROPPATCH,
        UNLOCK
    }
}
