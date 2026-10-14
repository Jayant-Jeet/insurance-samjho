package com.insurancesamjho;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insurancesamjho.service.PolicyDataStore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.graphql.tester.AutoConfigureGraphQlTester;
import org.springframework.graphql.test.tester.GraphQlTester;

@SpringBootTest
@AutoConfigureGraphQlTester
class PolicyGraphQLTests {

    @Autowired GraphQlTester tester;
    @Autowired PolicyDataStore store;
    @Autowired ObjectMapper mapper;

    @Test
    void mapsCardsAndFindings() throws Exception {
        String id = store.save(mapper.readTree("""
            {"out_of_pocket_map":[{"scenario":"waiting_period","risk":"high","confidence":"verify",
              "headline":{"en":"H","hi":"ह"},"explanation":{"en":"E"},
              "items":[{"label":{"en":"L"},"impact":"not_payable","extra":1,
                "evidence":[{"page":3,"clause":"C.1","quote":"q","segment_id":"s"}]}]}],
             "findings":[{"id":"f1","type":"caveat","severity":"info","title":{"en":"T"},"detail":{"en":"D"},
               "suggested_question_for_insurer":{"en":"Ask?"}}]}"""));

        tester.document("{ getOutOfPocketMap(documentId: \"" + id + "\") { risk confidence headline { hi } items { evidence { page quote } } } }")
                .execute().path("getOutOfPocketMap[0].items[0].evidence[0].page").entity(Integer.class).isEqualTo(3);
        tester.document("{ getPolicyFindings(documentId: \"" + id + "\") { suggestedQuestionForInsurer { en } } }")
                .execute().path("getPolicyFindings[0].suggestedQuestionForInsurer.en").entity(String.class).isEqualTo("Ask?");
    }

    @Test
    void unknownDocumentIsError() {
        tester.document("{ getPolicyFindings(documentId: \"nope\") { id } }")
                .execute().errors().expect(e -> "NOT_FOUND".equals(e.getErrorType().toString()));
    }
}
