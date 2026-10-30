import pytest

from app.article import ArticleError, check_url


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/",
        "http://127.0.0.1/",
        "http://10.0.0.5/x",
        "http://169.254.169.254/latest/meta-data",
        "http://0.0.0.0/",
        "http://[::1]/",
        "http://224.0.0.1/",
        "file:///etc/passwd",
        "ftp://example.com/",
        "gopher://example.com/",
        "not a url",
    ],
)
def test_blocked(url):
    with pytest.raises(ArticleError):
        check_url(url)
