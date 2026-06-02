"""Research context — paper metadata behind a model's architecture.

A distinct contract from `Spec` and `HubModelInfo`. `Paper` is the arXiv view of
the paper(s) a model cites (resolved from its Hub `arxiv:` tags). Future research
sources (HF Papers, GitHub) will add fields additively.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class Paper(BaseModel):
    """One arXiv paper. Built from the arXiv Atom feed."""

    model_config = ConfigDict(frozen=True)

    arxiv_id: str
    title: str
    summary: str  # the abstract
    authors: list[str] = Field(default_factory=list)
    published: str | None = None  # ISO-8601, passed through verbatim
    updated: str | None = None
    categories: list[str] = Field(default_factory=list)  # e.g. ["cs.CL", "cs.LG"]
    primary_category: str | None = None
    abs_url: str  # https://arxiv.org/abs/<id>
    pdf_url: str  # https://arxiv.org/pdf/<id>
    comment: str | None = None  # arXiv `comment` (e.g. "Accepted at NeurIPS 2017")
    doi: str | None = None
    # Citation metrics from an external citation graph (Semantic Scholar →
    # OpenAlex fallback). None when neither source has a record or the lookup
    # was unavailable — never a misleading zero.
    citation_count: int | None = None
    # Semantic-Scholar-only enrichments (present when SS has the paper):
    influential_citation_count: int | None = None  # citations that build on it
    tldr: str | None = None  # SS's one-sentence summary
    fields_of_study: list[str] = Field(default_factory=list)
    # From HF Papers (the Papers-With-Code successor): community upvotes and the
    # number of Hub models / datasets / spaces that cite this paper.
    hf_upvotes: int | None = None
    hf_model_count: int | None = None
    hf_dataset_count: int | None = None
    hf_space_count: int | None = None


class PaperMetrics(BaseModel):
    """Citation-graph metrics for one paper — the carrier returned by a
    `CitationClient`. Semantic Scholar fills all fields; OpenAlex fills only
    `citation_count` (its backstop role)."""

    model_config = ConfigDict(frozen=True)

    citation_count: int | None = None
    influential_citation_count: int | None = None
    tldr: str | None = None
    fields_of_study: list[str] = Field(default_factory=list)


class RepoInfo(BaseModel):
    """GitHub repository metadata for a model's linked code repo (best-effort)."""

    model_config = ConfigDict(frozen=True)

    full_name: str  # "owner/repo"
    html_url: str
    description: str | None = None
    stars: int | None = None
    forks: int | None = None
    topics: list[str] = Field(default_factory=list)
    license: str | None = None  # SPDX id, e.g. "Apache-2.0"
    language: str | None = None
    pushed_at: str | None = None


class SourceSnippet(BaseModel):
    """A slice of source code behind a module's `source_url` permalink."""

    model_config = ConfigDict(frozen=True)

    url: str
    owner: str
    repo: str
    ref: str
    path: str
    start_line: int
    end_line: int
    code: str
    language: str | None = None
