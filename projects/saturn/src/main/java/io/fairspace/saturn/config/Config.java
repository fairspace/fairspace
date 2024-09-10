package io.fairspace.saturn.config;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;
import org.apache.jena.atlas.json.JSON;
import org.apache.jena.tdb2.params.StoreParams;
import org.apache.jena.tdb2.params.StoreParamsCodec;

import java.io.IOException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class Config {
    static final ObjectMapper MAPPER = new ObjectMapper(new YAMLFactory())
            .registerModule(new SimpleModule()
                    .addSerializer(new StoreParamsSerializer())
                    .addDeserializer(StoreParams.class, new StoreParamsDeserializer()));

    public int port = 8090;

    public int livenessPort = 8091;

    public String publicUrl = "http://localhost:8080";

    public Auth auth = new Auth();

    public WebDAV webDAV = new WebDAV();

    public ExtraStorage extraStorage = new ExtraStorage();

    @JsonSetter(nulls = Nulls.AS_EMPTY)
    public Map<String, String> services = new HashMap<>();

    public Search search = new Search();

    public static class Jena {
        public String metadataBaseIRI = "http://localhost/iri/";

        public File datasetPath = new File("data/db");

        public final StoreParams storeParams = StoreParams.getDftStoreParams();

        public File transactionLogPath = new File("data/log");

        public boolean bulkTransactions = true;
    }

    public static class Auth {
        public String authServerUrl = "http://localhost:5100/";
        public String realm = "fairspace";
        public String clientId = "workspace-client";
        public boolean enableBasicAuth;
        public String superAdminUser = "organisation-admin";

        @JsonSetter(nulls = Nulls.AS_EMPTY)
        public final Set<String> defaultUserRoles = new HashSet<>();
    }

    public static class WebDAV {
        public String blobStorePath = "data/blobs";
    }

    public static class Search {
        public long pageRequestTimeout = 10_000;
        public long countRequestTimeout = 100_1000;
        /** maxJoinItems is used to limit number of joined entries (from the join view) to decrease the response size */
        public int maxJoinItems = 50;
    }

    public static class ExtraStorage {
        public String blobStorePath = "data/extra-blobs";

        @JsonSetter(nulls = Nulls.AS_EMPTY)
        public final Set<String> defaultRootCollections = new HashSet<>(List.of("analysis-export"));
    }

    @Override
    public String toString() {
        try {
            return MAPPER.writeValueAsString(this);
        } catch (JsonProcessingException e) {
            return super.toString();
        }
    }

    public static class StoreParamsSerializer extends StdSerializer<StoreParams> {
        public StoreParamsSerializer() {
            super(StoreParams.class);
        }

        @Override
        public void serialize(StoreParams value, JsonGenerator gen, SerializerProvider provider) throws IOException {
            var node = MAPPER.readTree(StoreParamsCodec.encodeToJson(value).toString());
            gen.writeObject(node);
        }
    }

    public static class StoreParamsDeserializer extends StdDeserializer<StoreParams> {
        protected StoreParamsDeserializer() {
            super(StoreParams.class);
        }

        @Override
        public StoreParams deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
            return StoreParamsCodec.decode(JSON.parse(p.readValueAsTree().toString()));
        }
    }
}
