import { describe, expect, it } from "vitest";

import { highlightToHtml } from "./highlight";

describe("highlightToHtml", () => {
  it("wraps Python keywords and strings in Prism token spans", () => {
    const html = highlightToHtml('def f():\n    return "hi"', "python");
    expect(html).toContain('class="token keyword"'); // def / return
    expect(html).toContain('class="token string"'); // "hi"
  });

  it("defaults to Python when no language hint is given", () => {
    const html = highlightToHtml("class C:\n    pass");
    expect(html).toContain('class="token keyword"');
  });

  it("recognises the 'py' alias", () => {
    expect(highlightToHtml("import torch", "py")).toContain('class="token keyword"');
  });

  it("falls back to escaped plain text for languages with no grammar", () => {
    const html = highlightToHtml("a < b && c > d", "unknown-lang");
    expect(html).not.toContain('class="token');
    expect(html).toContain("&lt;");
    expect(html).toContain("&gt;");
    expect(html).toContain("&amp;");
  });
});
