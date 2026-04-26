package com.smartproduct.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

@RestController
public class FileController {
    private final Path uploadRoot = Path.of("target", "uploads");

    @PostMapping("/v1/data/business/upload/file")
    public Map<String, Object> upload(MultipartFile file, @RequestParam(value = "filename", required = false) String filename) throws Exception {
        String original = filename == null || filename.isBlank() ? file.getOriginalFilename() : filename;
        if (original == null || original.isBlank()) {
            original = "file";
        }
        Path dir = uploadRoot.resolve(UUID.randomUUID().toString());
        Files.createDirectories(dir);
        Path target = dir.resolve(Path.of(original).getFileName());
        file.transferTo(target);
        String filePath = "/data/" + uploadRoot.relativize(target).toString().replace('\\', '/');
        return Map.of(
                "status", "success",
                "message", original + " uploaded successfully",
                "file_path", filePath,
                "filePath", filePath
        );
    }
}
