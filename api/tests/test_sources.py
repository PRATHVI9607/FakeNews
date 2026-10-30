from app import sources


def test_www_and_case_insensitive():
    for host in ("100percentfedup.com", "WWW.100PercentFedUp.com"):
        (entry,) = sources.lookup(host)
        assert entry["source"] == "OpenSources"
        assert entry["found"]
        assert entry["category"] == "bias"
        assert entry["description"]
        assert entry["notes"] is None


def test_notes_passed_through():
    (entry,) = sources.lookup("16wmpo.com")
    assert entry["category"] == "fake"
    assert entry["notes"].startswith("http")


def test_unknown_domain():
    (entry,) = sources.lookup("example.org")
    assert entry == {"source": "OpenSources", "found": False, "category": None, "description": None, "notes": None}


def test_path_keyed_entries_do_not_flag_whole_domain():
    assert not sources.lookup("cato.org")[0]["found"]
