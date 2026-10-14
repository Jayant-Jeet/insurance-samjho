package com.insurancesamjho.web;

public class DocumentNotFoundException extends RuntimeException {
    public DocumentNotFoundException(String documentId) {
        super("No document found for id " + documentId);
    }
}
