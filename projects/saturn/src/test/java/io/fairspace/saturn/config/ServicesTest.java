package io.fairspace.saturn.config;

import io.fairspace.saturn.rdf.transactions.RDFLinkSimple;
import org.apache.jena.rdfconnection.RDFConnection;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

@RunWith(MockitoJUnitRunner.class)
public class ServicesTest {
    @Mock
    private RDFConnection rdf;

    private Config config = new Config();

    private Services svc;


    @Before
    public void before() throws Exception {
        svc = new Services(config, new RDFLinkSimple(rdf));
    }

    @Test
    public void getConfig() {
        assertEquals(config, svc.getConfig());
    }

    @Test
    public void getEventBus() {
        assertNotNull(svc.getEventBus());
    }

    @Test
    public void getUserService() {
        assertNotNull(svc.getUserService());
    }

    @Test
    public void getEventService() {
        assertNotNull(svc.getEventService());
    }

    @Test
    public void getMailService() {
        assertNotNull(svc.getMailService());
    }

    @Test
    public void getPermissionsService() {
        assertNotNull(svc.getPermissionsService());
    }

    @Test
    public void getCollectionsService() {
        assertNotNull(svc.getCollectionsService());
    }

    @Test
    public void getMetadataService() {
        assertNotNull(svc.getMetadataService());
    }

    @Test
    public void getUserVocabularyService() {
        assertNotNull(svc.getUserVocabularyService());
    }

    @Test
    public void getMetaVocabularyService() {
        assertNotNull(svc.getUserVocabularyService());
    }
}