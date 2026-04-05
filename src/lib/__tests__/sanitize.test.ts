import { describe, it, expect } from "vitest";
import { sanitizeText, sanitizeFields } from "@/lib/sanitize";

describe("sanitizeText", () => {
  it("strips HTML tags", () => {
    expect(sanitizeText("<script>alert('xss')</script>hello")).toBe("alert('xss')hello");
    expect(sanitizeText("<b>bold</b>")).toBe("bold");
    expect(sanitizeText("<img src=x onerror=alert(1)>")).toBe("");
  });

  it("removes javascript: URIs", () => {
    expect(sanitizeText("javascript:alert(1)")).toBe("alert(1)");
    expect(sanitizeText("JAVASCRIPT:void(0)")).toBe("void(0)");
  });

  it("removes event handlers", () => {
    expect(sanitizeText("onclick=alert(1)")).toBe("alert(1)");
    expect(sanitizeText("onmouseover=hack()")).toBe("hack()");
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("returns empty/falsy input as-is", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("handles normal text without modification", () => {
    expect(sanitizeText("Hello, I love Italian food!")).toBe("Hello, I love Italian food!");
  });
});

describe("sanitizeFields", () => {
  it("sanitizes specified string fields", () => {
    const obj = { name: "<b>Chef</b>", bio: "<script>x</script>Nice", age: 30 };
    const result = sanitizeFields(obj, ["name", "bio"]);
    expect(result.name).toBe("Chef");
    expect(result.bio).toBe("xNice");
    expect(result.age).toBe(30);
  });

  it("skips non-string fields", () => {
    const obj = { name: "test", count: 5 };
    const result = sanitizeFields(obj, ["name", "count"]);
    expect(result.count).toBe(5);
  });
});
