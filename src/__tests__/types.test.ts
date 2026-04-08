import { describe, expect, it } from "vitest";
import { validatePath } from "../types.js";

describe("validatePath", () => {
  it("rejects path traversal", () => {
    expect(() => validatePath("../etc/passwd")).toThrow(
      "Path traversal not allowed",
    );
  });

  it("rejects embedded path traversal", () => {
    expect(() => validatePath("folder/../secret")).toThrow(
      "Path traversal not allowed",
    );
  });

  it("rejects absolute unix paths", () => {
    expect(() => validatePath("/etc/passwd")).toThrow(
      "Absolute paths not allowed",
    );
  });

  it("rejects windows absolute paths", () => {
    expect(() => validatePath("C:\\Windows")).toThrow(
      "Absolute paths not allowed",
    );
  });

  it("rejects lowercase windows drive letters", () => {
    expect(() => validatePath("d:\\Users\\file")).toThrow(
      "Absolute paths not allowed",
    );
  });

  it("normalizes backslashes to forward slashes", () => {
    expect(validatePath("foo\\bar\\baz")).toBe("foo/bar/baz");
  });

  it("accepts valid relative paths", () => {
    expect(validatePath("folder/note.md")).toBe("folder/note.md");
  });

  it("accepts simple filenames", () => {
    expect(validatePath("note.md")).toBe("note.md");
  });
});
