package com.insurancesamjho.web;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insurancesamjho.model.Dtos.Finding;
import com.insurancesamjho.model.Dtos.OutOfPocketCard;
import com.insurancesamjho.service.PolicyDataStore;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class PolicyGraphQLController {

    private final PolicyDataStore dataStore;
    private final ObjectMapper mapper;

    @QueryMapping
    public List<OutOfPocketCard> getOutOfPocketMap(@Argument String documentId) {
        return read(documentId, "out_of_pocket_map", new TypeReference<>() {});
    }

    @QueryMapping
    public List<Finding> getPolicyFindings(@Argument String documentId) {
        return read(documentId, "findings", new TypeReference<>() {});
    }

    private <T> List<T> read(String documentId, String field, TypeReference<List<T>> type) {
        JsonNode policy = dataStore.find(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));
        JsonNode node = policy.path(field);
        if (!node.isArray()) {
            return List.of();
        }
        return mapper.convertValue(node, type);
    }
}
