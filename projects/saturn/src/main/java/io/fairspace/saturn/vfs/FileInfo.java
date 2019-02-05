package io.fairspace.saturn.vfs;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FileInfo {
    String path;
    boolean isDirectory;
    long size;
    long created;
    long modified;
    boolean isReadable;
    boolean isWriteable;
    String createdBy;
    String modifiedBy;
}
