package io.fairspace.saturn.rdf.transactions;

import java.io.*;

import org.apache.jena.atlas.io.IndentedLineBuffer;
import org.apache.jena.graph.Node;
import org.apache.jena.sparql.core.Prologue;
import org.apache.jena.sparql.core.Quad;
import org.apache.jena.sparql.modify.request.*;
import org.apache.jena.sparql.serializer.SerializationContext;
import org.apache.jena.sparql.util.NodeToLabelMap;
import org.apache.jena.update.Update;
import org.apache.jena.update.UpdateFactory;

import static java.lang.Long.parseLong;
import static java.nio.charset.StandardCharsets.UTF_8;
import static java.util.Collections.singletonList;

public class SparqlTransactionCodec implements TransactionCodec {
    private static final String TIMESTAMP_PREFIX = "# Timestamp: ";
    private static final String USER_NAME_PREFIX = "# User Name: ";
    private static final String USER_ID_PREFIX = "# User ID: ";
    private static final String COMMITTED = "# Committed";
    private static final String ABORTED = "# Aborted";
    private static final Prologue PROLOGUE = new Prologue();

    @Override
    public TransactionListener write(OutputStream out) throws IOException {
        return new TransactionListener() {
            private final OutputStreamWriter writer = new OutputStreamWriter(out, UTF_8);

            @Override
            public void onMetadata(String userId, String userName, long timestamp) throws IOException {
                writer.write(TIMESTAMP_PREFIX + timestamp + "\n");
                if (userName != null) {
                    writer.write(USER_NAME_PREFIX + userName + "\n");
                }
                if (userId != null) {
                    writer.write(USER_ID_PREFIX + userId + "\n");
                }
                writer.write('\n');
            }

            @Override
            public void onAdd(Node graph, Node subject, Node predicate, Node object) throws IOException {
                save(new UpdateDataInsert(toQuads(graph, subject, predicate, object)));
            }

            @Override
            public void onDelete(Node graph, Node subject, Node predicate, Node object) throws IOException {
                save(new UpdateDataDelete(toQuads(graph, subject, predicate, object)));
            }

            private void save(Update update) throws IOException {
                var buff = new IndentedLineBuffer();
                var sc = new SerializationContext(PROLOGUE, new NodeToLabelMap("b", true));
                UpdateWriter.output(update, buff, sc);
                writer.append(buff.toString().replace('\n', ' ')).append(";\n");
            }

            private QuadDataAcc toQuads(Node graph, Node subject, Node predicate, Node object) {
                return new QuadDataAcc(singletonList(new Quad(graph, subject, predicate, object)));
            }

            @Override
            public void onCommit() throws IOException {
                writer.append(COMMITTED).append('\n');
                writer.flush();
            }

            @Override
            public void onAbort() throws IOException {
                writer.append(ABORTED).append('\n');
                writer.flush();
            }
        };
    }

    @Override
    public void read(InputStream in, TransactionListener listener) throws IOException {
        listener.onBegin();

        var reader = new BufferedReader(new InputStreamReader(in, UTF_8));

        long timestamp = 0L;
        String userName = null;
        String userId = null;

        String line;
        while ((line = reader.readLine()) != null) {
            if (line.startsWith(TIMESTAMP_PREFIX)) {
                timestamp = parseLong(line.substring(TIMESTAMP_PREFIX.length()));
            } else if (line.startsWith(USER_NAME_PREFIX)) {
                userName = line.substring(USER_NAME_PREFIX.length());
            } else if (line.startsWith(USER_ID_PREFIX)) {
                userId = line.substring(USER_ID_PREFIX.length());
            } else if (line.isBlank()) {
                listener.onMetadata(userId, userName, timestamp);

                timestamp = 0L;
                userName = null;
                userId = null;
            } else if (line.equals(COMMITTED)) {
                listener.onCommit();
            } else if (line.equals(ABORTED)) {
                listener.onAbort();
            } else {
                for (var update : UpdateFactory.create(line)) {
                    if (update instanceof UpdateDataDelete) {
                        for (var quad : ((UpdateDataDelete) update).getQuads()) {
                            listener.onDelete(
                                    quad.getGraph(), quad.getSubject(), quad.getPredicate(), quad.getObject());
                        }
                    } else if (update instanceof UpdateDataInsert) {
                        for (var quad : ((UpdateDataInsert) update).getQuads()) {
                            listener.onAdd(quad.getGraph(), quad.getSubject(), quad.getPredicate(), quad.getObject());
                        }
                    }
                }
            }
        }
    }
}
