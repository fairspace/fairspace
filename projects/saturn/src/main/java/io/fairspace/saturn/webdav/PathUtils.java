package io.fairspace.saturn.webdav;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import io.milton.http.exceptions.BadRequestException;

import static org.apache.commons.lang3.StringUtils.strip;
import static org.apache.http.client.utils.URLEncodedUtils.formatSegments;

public class PathUtils {
    private static final int MAX_COLLECTION_NAME_LENGTH = 127;

    public static String normalizePath(String path) {
        return strip(path, "/");
    }

    public static String encodePath(String path) {
        return normalizePath(formatSegments(splitPath(path)));
    }

    public static String[] splitPath(String path) {
        return normalizePath(path).split("/");
    }

    public static String name(String path) {
        var parts = splitPath(path);
        return (parts.length == 0) ? "" : parts[parts.length - 1];
    }

    public static void validateCollectionName(String name) throws BadRequestException {
        if (name == null || name.isEmpty()) {
            throw new BadRequestException("The collection name is empty.");
        }
        if (name.length() > MAX_COLLECTION_NAME_LENGTH) {
            throw new BadRequestException(
                    "The collection name exceeds maximum length " + MAX_COLLECTION_NAME_LENGTH + ".");
        }
        if (name.contains("\\")) {
            throw new BadRequestException("The collection name contains an illegal character (\\)");
        }
    }

    public static String getCollectionNameByUri(String rootSubjectUri, String uri) {
        var rootLocation = rootSubjectUri + "/";
        var location = uri.substring(rootLocation.length());
        return URLDecoder.decode(location.split("/")[0], StandardCharsets.UTF_8);
    }
}
