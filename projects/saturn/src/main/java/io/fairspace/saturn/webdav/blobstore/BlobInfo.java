package io.fairspace.saturn.webdav.blobstore;

import lombok.AllArgsConstructor;

@AllArgsConstructor
public class BlobInfo {
    public final String id;
    public final long size;
    public final String md5;
}
