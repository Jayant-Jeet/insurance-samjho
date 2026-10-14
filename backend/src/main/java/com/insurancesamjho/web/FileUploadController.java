package com.insurancesamjho.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.insurancesamjho.service.MlServiceClient;
import com.insurancesamjho.service.PolicyDataStore;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@RestController
@RequestMapping("/api/policy")
@RequiredArgsConstructor
public class FileUploadController {

    private final MlServiceClient mlServiceClient;
    private final PolicyDataStore dataStore;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mode", defaultValue = "online") String mode)
            throws IOException {
        if (file.isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "Uploaded file is empty");
        }
        if (!mode.equals("online") && !mode.equals("local")) {
            return error(HttpStatus.BAD_REQUEST, "mode must be 'online' or 'local'");
        }
        JsonNode result = mlServiceClient.processPolicy(file, mode);
        if (result == null || !result.isObject()) {
            return error(HttpStatus.BAD_GATEWAY, "ML service returned no result");
        }
        return ResponseEntity.ok(Map.of("documentId", dataStore.save(result)));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(WebClientResponseException.class)
    ResponseEntity<Map<String, String>> onMlError(WebClientResponseException e) {
        HttpStatus status = e.getStatusCode().is4xxClientError() ? HttpStatus.valueOf(e.getStatusCode().value())
                : HttpStatus.BAD_GATEWAY;
        return error(status, "ML service error: " + e.getResponseBodyAsString());
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(WebClientRequestException.class)
    ResponseEntity<Map<String, String>> onMlUnreachable(WebClientRequestException e) {
        return error(HttpStatus.BAD_GATEWAY, "ML service unreachable");
    }

    private static ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }
}
