"""arXiv API client — fetches paper metadata and parses the Atom feed.

The arXiv query API returns Atom XML (not JSON); we parse it with the stdlib
`xml.etree.ElementTree` (no `feedparser` dependency). arXiv is a trusted source,
so stdlib XML parsing is acceptable here. This is one of the infrastructure
modules allowed to import `httpx`.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET

import httpx

from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.research import Paper

_ARXIV_API = "https://export.arxiv.org/api/query"
_DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}

# Accept new-style ("2302.13971", optional vN) and old-style ("math/0309136")
# ids; reject anything else so it can't be smuggled into the query param.
_VALID_ID = re.compile(r"^(\d{4}\.\d{4,5}(v\d+)?|[a-z\-]+(\.[A-Z]{2})?/\d{7}(v\d+)?)$")


def _clean(text: str | None) -> str:
    """Collapse arXiv's wrapped/indented text into a single clean line."""
    return " ".join(text.split()) if text else ""


class ArxivApiClient:
    """Async client for the arXiv query API."""

    def __init__(
        self,
        *,
        client: httpx.AsyncClient | None = None,
        timeout: httpx.Timeout = _DEFAULT_TIMEOUT,
    ) -> None:
        self._client = client or httpx.AsyncClient(timeout=timeout, follow_redirects=True)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def get_papers(self, arxiv_ids: list[str]) -> list[Paper]:
        ids = [i for i in (a.strip() for a in arxiv_ids) if _VALID_ID.match(i)]
        if not ids:
            return []
        joined = ",".join(ids)
        try:
            resp = await self._client.get(
                _ARXIV_API,
                params={"id_list": joined, "max_results": str(len(ids))},
            )
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            raise HubUnavailable(joined, source="arxiv") from exc
        # arXiv 429s aggressively; treat any non-200 as "unavailable" so callers
        # degrade gracefully (the HF Papers primary path handles the common case).
        if resp.status_code != 200:
            raise HubUnavailable(joined, source="arxiv")
        return _parse_feed(resp.text)


def _parse_feed(xml_text: str) -> list[Paper]:
    root = ET.fromstring(xml_text)  # arXiv is a trusted source
    papers: list[Paper] = []
    for entry in root.findall("atom:entry", _NS):
        paper = _parse_entry(entry)
        if paper is not None:
            papers.append(paper)
    return papers


def _parse_entry(entry: ET.Element) -> Paper | None:
    raw_id = _clean(entry.findtext("atom:id", default="", namespaces=_NS))
    # raw_id looks like "http://arxiv.org/abs/1706.03762v7"
    arxiv_id = raw_id.rsplit("/abs/", 1)[-1] if "/abs/" in raw_id else raw_id
    if not arxiv_id:
        return None

    authors = [
        _clean(name.text)
        for name in entry.findall("atom:author/atom:name", _NS)
        if name.text
    ]
    categories = [
        term for c in entry.findall("atom:category", _NS) if (term := c.get("term"))
    ]
    primary = entry.find("arxiv:primary_category", _NS)

    pdf_url = ""
    abs_url = ""
    for link in entry.findall("atom:link", _NS):
        if link.get("title") == "pdf":
            pdf_url = link.get("href", "")
        elif link.get("rel") == "alternate":
            abs_url = link.get("href", "")

    return Paper(
        arxiv_id=arxiv_id,
        title=_clean(entry.findtext("atom:title", default="", namespaces=_NS)),
        summary=_clean(entry.findtext("atom:summary", default="", namespaces=_NS)),
        authors=authors,
        published=entry.findtext("atom:published", default=None, namespaces=_NS),
        updated=entry.findtext("atom:updated", default=None, namespaces=_NS),
        categories=categories,
        primary_category=primary.get("term") if primary is not None else None,
        abs_url=abs_url or f"https://arxiv.org/abs/{arxiv_id}",
        pdf_url=pdf_url or f"https://arxiv.org/pdf/{arxiv_id}",
        comment=_clean(entry.findtext("arxiv:comment", default="", namespaces=_NS)) or None,
        doi=_clean(entry.findtext("arxiv:doi", default="", namespaces=_NS)) or None,
    )
