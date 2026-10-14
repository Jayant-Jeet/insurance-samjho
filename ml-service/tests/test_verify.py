from app.verify import verify_evidence

PAGES = ["Room rent is limited to 1% of\nsum insured per day.", "Waiting period 30 days."]


def ev(page, quote):
    return {"page": page, "quote": quote}


def test_matching_quote_keeps_confidence():
    d = {"a": {"evidence": [ev(1, "Room rent is limited to 1% of sum insured")], "confidence": "high"}}
    assert verify_evidence(d, PAGES)["a"]["confidence"] == "high"


def test_wrong_text_flags_parent():
    d = {"a": {"evidence": [ev(1, "Room rent is unlimited")], "confidence": "high"}}
    assert verify_evidence(d, PAGES)["a"]["confidence"] == "verify"


def test_wrong_page_flags_nested_in_list():
    d = {"items": [{"evidence": [ev(2, "Room rent is limited")]}]}
    assert verify_evidence(d, PAGES)["items"][0]["confidence"] == "verify"


def test_out_of_range_page():
    d = {"evidence": [ev(9, "Waiting period")]}
    assert verify_evidence(d, PAGES)["confidence"] == "verify"
