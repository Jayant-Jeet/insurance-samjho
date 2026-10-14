package com.insurancesamjho.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/** Temporary in-memory storage; contents are lost on restart (nothing is persisted, by design). */
@Service
public class PolicyDataStore {

    private final Map<String, JsonNode> store = new ConcurrentHashMap<>();

    public String save(JsonNode policy) {
        String id = UUID.randomUUID().toString();
        store.put(id, policy);
        return id;
    }

    public Optional<JsonNode> find(String documentId) {
        return Optional.ofNullable(store.get(documentId));
    }
}
