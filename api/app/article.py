import ipaddress
import socket
from urllib.parse import urljoin, urlsplit

import nltk
import requests
from newspaper import Article

TIMEOUT = 10
MAX_BYTES = 5_000_000
MAX_REDIRECTS = 5


try:
    nltk.data.find("tokenizers/punkt")  # needed by Article.nlp()
except LookupError:
    nltk.download("punkt", quiet=True)


class ArticleError(ValueError):
    pass


def check_url(url: str) -> str:
    """Reject non-http(s) URLs and hosts resolving to non-public addresses. Returns the hostname."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ArticleError("Only http and https URLs are supported")
    try:
        addresses = {info[4][0] for info in socket.getaddrinfo(parts.hostname, parts.port)}
    except socket.gaierror:
        raise ArticleError(f"Cannot resolve host {parts.hostname}") from None
    for address in addresses:
        ip = ipaddress.ip_address(address.split("%")[0])
        if not ip.is_global or ip.is_multicast:
            raise ArticleError("URL points to a non-public address")
    return parts.hostname


def _download(url: str) -> bytes:
    # Redirects are followed by hand so every hop passes the SSRF check.
    # shortcut: DNS is resolved again by requests, so a rebinding host could slip through; pin the IP if this faces hostile users.
    for _ in range(MAX_REDIRECTS + 1):
        check_url(url)
        with requests.get(
            url, timeout=TIMEOUT, allow_redirects=False, stream=True, headers={"User-Agent": "Mozilla/5.0"}
        ) as response:
            if response.is_redirect:
                url = urljoin(url, response.headers["Location"])
                continue
            response.raise_for_status()
            body = b""
            for chunk in response.iter_content(65536):
                body += chunk
                if len(body) > MAX_BYTES:
                    raise ArticleError("Page is too large")
            return body
    raise ArticleError("Too many redirects")


def extract(url: str) -> dict:
    try:
        html = _download(url)
    except requests.RequestException as e:
        raise ArticleError(f"Could not download article: {e}") from e
    article = Article(url)
    article.download(input_html=html)
    article.parse()
    article.nlp()
    return {
        "title": article.title or None,
        "authors": article.authors,
        "publish_date": article.publish_date.isoformat() if article.publish_date else None,
        "top_image": article.top_image or None,
        "text": article.text,
        "summary": article.summary or None,
        "keywords": article.keywords,
    }
