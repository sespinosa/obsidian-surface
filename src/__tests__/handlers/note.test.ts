import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../cli.js", () => ({
  execObsidian: vi.fn(),
}));

describe("note handlers", () => {
  let execObsidian: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const cli = await import("../../cli.js");
    execObsidian = vi.mocked(cli.execObsidian);
  });

  describe("noteCreate", () => {
    it("constructs args with path only", async () => {
      execObsidian.mockResolvedValue("Created");
      const { noteCreate } = await import("../../tools/note.js");

      const result = await noteCreate({ path: "notes/test.md" });

      expect(execObsidian).toHaveBeenCalledWith([
        "create",
        "path=notes/test.md",
      ]);
      expect(result.content[0].text).toBe("Created");
    });

    it("includes content when provided", async () => {
      execObsidian.mockResolvedValue("");
      const { noteCreate } = await import("../../tools/note.js");

      await noteCreate({ path: "notes/test.md", content: "Hello world" });

      expect(execObsidian).toHaveBeenCalledWith([
        "create",
        "path=notes/test.md",
        "content=Hello world",
      ]);
    });

    it("includes open and newtab flags", async () => {
      execObsidian.mockResolvedValue("");
      const { noteCreate } = await import("../../tools/note.js");

      await noteCreate({
        path: "notes/test.md",
        content: "Body",
        open: true,
        newtab: true,
      });

      expect(execObsidian).toHaveBeenCalledWith([
        "create",
        "path=notes/test.md",
        "content=Body",
        "open",
        "newtab",
      ]);
    });

    it("returns fallback message when execObsidian returns empty", async () => {
      execObsidian.mockResolvedValue("");
      const { noteCreate } = await import("../../tools/note.js");

      const result = await noteCreate({ path: "notes/test.md" });

      expect(result.content[0].text).toBe("Created note: notes/test.md");
    });
  });

  describe("noteRead", () => {
    it("calls execObsidian with read command", async () => {
      execObsidian.mockResolvedValue("File content here");
      const { noteRead } = await import("../../tools/note.js");

      const result = await noteRead({ path: "notes/test.md" });

      expect(execObsidian).toHaveBeenCalledWith(["read", "path=notes/test.md"]);
      expect(result.content[0].text).toBe("File content here");
    });
  });

  describe("noteWrite", () => {
    it("calls execObsidian with overwrite flag", async () => {
      execObsidian.mockResolvedValue("");
      const { noteWrite } = await import("../../tools/note.js");

      const result = await noteWrite({
        path: "notes/test.md",
        content: "New content",
      });

      expect(execObsidian).toHaveBeenCalledWith([
        "create",
        "path=notes/test.md",
        "content=New content",
        "overwrite",
      ]);
      expect(result.content[0].text).toBe("Wrote to note: notes/test.md");
    });
  });

  describe("noteList", () => {
    it("lists files without folder filter", async () => {
      execObsidian.mockResolvedValue("file1.md\nfile2.md");
      const { noteList } = await import("../../tools/note.js");

      const result = await noteList({});

      expect(execObsidian).toHaveBeenCalledWith(["files"]);
      expect(result.content[0].text).toBe("file1.md\nfile2.md");
    });

    it("includes folder filter when provided", async () => {
      execObsidian.mockResolvedValue("file1.md");
      const { noteList } = await import("../../tools/note.js");

      await noteList({ folder: "notes/subfolder" });

      expect(execObsidian).toHaveBeenCalledWith([
        "files",
        "folder=notes/subfolder",
      ]);
    });
  });

  describe("noteMove", () => {
    it("constructs move command with path and destination", async () => {
      execObsidian.mockResolvedValue("");
      const { noteMove } = await import("../../tools/note.js");

      const result = await noteMove({
        path: "notes/old.md",
        destination: "archive/old.md",
      });

      expect(execObsidian).toHaveBeenCalledWith([
        "move",
        "path=notes/old.md",
        "to=archive/old.md",
      ]);
      expect(result.content[0].text).toContain("Moved note:");
    });
  });
});
