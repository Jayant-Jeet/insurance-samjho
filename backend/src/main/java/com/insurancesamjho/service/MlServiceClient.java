package com.insurancesamjho.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class MlServiceClient {

    private final WebClient webClient;
    private final Duration timeout;

    public MlServiceClient(
            WebClient.Builder builder,
            @Value("${ml.service.url:http://localhost:8001}") String baseUrl,
            @Value("${ml.service.timeout-seconds}") long timeoutSeconds) {
        this.webClient = builder
                .baseUrl(baseUrl)
                .codecs(c -> c.defaultCodecs().maxInMemorySize(64 * 1024 * 1024))
                .build();
        this.timeout = Duration.ofSeconds(timeoutSeconds);
    }

    public JsonNode processPolicy(MultipartFile file, String mode) throws IOException {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "policy.pdf";
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("file", resource).contentType(MediaType.APPLICATION_PDF);

        return webClient.post()
                .uri(u -> u.path("/process-policy").queryParam("mode", mode).build())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(body.build()))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block(timeout);
    }
}
