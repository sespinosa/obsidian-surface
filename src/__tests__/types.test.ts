import { describe, expect, it } from "vitest";
import { validatePath } from "../types.js";

describe("validatePath", () => {
  it("rejects path traversal", () => {
    expect(() => validatePath("../etc/passwd")).toThrow(
      "Path traversal not allowed",
    );
  });

  it("normalizes embedded traversal that stays within vault", () => {
    expect(validatePath("folder/../secret")).toBe("secret");
  });

  it("rejects traversal that escapes vault root", () => {
    expect(() => validatePath("folder/../../secret")).toThrow(
      "Path traversal not allowed",
    );
  });

  it("rejects null bytes", () => {
    expect(() => validatePath("folder/\0evil")).toThrow("Invalid path");
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

  it("rejects windows forward-slash absolute paths", () => {
    expect(() => validatePath("C:/Users/foo/bar")).toThrow(
      "Absolute paths not allowed",
    );
  });

  it("rejects UNC paths", () => {
    expect(() => validatePath("\\\\server\\share")).toThrow(
      "Absolute paths not allowed",
    );
  });

  it("rejects newlines", () => {
    expect(() => validatePath("folder\nevil")).toThrow("newlines not allowed");
  });
});
