package com.insurancesamjho.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** Java records mirroring the GraphQL schema; unknown JSON fields from policy.schema.json are ignored. */
public final class Dtos {
    private Dtos() {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LocalizedText(String en, String hi) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Evidence(Integer page, String clause, String quote) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CardItem(LocalizedText label, String impact, List<Evidence> evidence) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OutOfPocketCard(
            String scenario,
            String risk,
            LocalizedText headline,
            LocalizedText explanation,
            List<CardItem> items,
            String confidence) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Finding(
            String id,
            String type,
            String severity,
            LocalizedText title,
            LocalizedText detail,
            @JsonProperty("suggested_question_for_insurer") LocalizedText suggestedQuestionForInsurer) {}
}
