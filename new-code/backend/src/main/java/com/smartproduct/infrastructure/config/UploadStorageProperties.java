package com.smartproduct.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Component
public class UploadStorageProperties {
    private final Path root;

    public UploadStorageProperties(@Value("${app.upload-dir:D:/coder/code-store/go/smart_product/new-code/backend/upload}") String uploadDir) {
        this.root = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public Path root() {
        return root;
    }

    public Path resolve(String relative) {
        return root.resolve(relative).normalize();
    }

    public String[] resourceLocations() {
        String location = root.toUri().toString();
        return new String[] {
                (location.endsWith("/") ? location : location + "/")
        };
    }
}
