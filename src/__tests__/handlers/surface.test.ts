import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../cli.js", () => ({
  execObsidian: vi.fn(),
}));

vi.mock("../../index-manager.js", () => ({
  appendEntry: vi.fn(),
  queryIndex: vi.fn(),
  recentEntries: vi.fn(),
  removeEntriesByProject: vi.fn(),
  reindex: vi.fn(),
}));

vi.mock("../../state.js", () => ({
  getProject: vi.fn(() => "test-project"),
  setProject: vi.fn(),
}));

describe("surface handlers", () => {
  let execObsidian: ReturnType<typeof vi.fn>;
  let appendEntry: ReturnType<typeof vi.fn>;
  let queryIndex: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const cli = await import("../../cli.js");
    const indexManager = await import("../../index-manager.js");
    execObsidian = vi.mocked(cli.execObsidian);
    appendEntry = vi.mocked(indexManager.appendEntry);
    queryIndex = vi.mocked(indexManager.queryIndex);
  });

  describe("surfaceCreate", () => {
    it("calls execObsidian with correct arguments", async () => {
      execObsidian.mockResolvedValue("Created");
      appendEntry.mockResolvedValue(undefined);

      const { surfaceCreate } = await import("../../tools/surface.js");
      const result = await surfaceCreate({
        name: "my-surface",
        content: "Some content",
        summary: "A summary",
      });

      expect(execObsidian).toHaveBeenCalledWith([
        "create",
        expect.stringContaining("path=_surfaces/test-project/my-surface.md"),
        expect.stringContaining("content="),
        "open",
        "newtab",
      ]);
      expect(result.content[0].text).toBe("Created");
      expect(result.isError).toBeUndefined();
    });

    it("includes type and tags in frontmatter when provided", async () => {
      execObsidian.mockResolvedValue("Created");
      appendEntry.mockResolvedValue(undefined);

      const { surfaceCreate } = await import("../../tools/surface.js");
      await surfaceCreate({
        name: "tagged-surface",
        content: "Content",
        summary: "Summary",
        type: "research",
        tags: ["api", "design"],
      });

      const contentArg = execObsidian.mock.calls[0][0][2] as string;
      expect(contentArg).toContain("type: research");
      expect(contentArg).toContain("tags: [api, design]");
    });

    it("calls appendEntry with correct data", async () => {
      execObsidian.mockResolvedValue("Created");
      appendEntry.mockResolvedValue(undefined);

      const { surfaceCreate } = await import("../../tools/surface.js");
      await surfaceCreate({
        name: "indexed-surface",
        content: "Content",
        summary: "My summary",
        type: "decision",
        tags: ["tag1"],
      });

      expect(appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "_surfaces/test-project/indexed-surface.md",
          project: "test-project",
          type: "decision",
          tags: ["tag1"],
          summary: "My summary",
        }),
      );
    });

    it("returns fallback message when execObsidian returns empty", async () => {
      execObsidian.mockResolvedValue("");
      appendEntry.mockResolvedValue(undefined);

      const { surfaceCreate } = await import("../../tools/surface.js");
      const result = await surfaceCreate({
        name: "empty-result",
        content: "Content",
        summary: "Summary",
      });

      expect(result.content[0].text).toContain("Created surface:");
    });
  });

  describe("surfaceList", () => {
    it("formats entries into a readable list", async () => {
      queryIndex.mockResolvedValue([
        {
          path: "_surfaces/test-project/note1.md",
          project: "test-project",
          created: "2025-01-01",
          type: "research",
          tags: ["api"],
          summary: "API research",
        },
      ]);

      const { surfaceList } = await import("../../tools/surface.js");
      const result = await surfaceList({});

      expect(result.content[0].text).toContain(
        "_surfaces/test-project/note1.md",
      );
      expect(result.content[0].text).toContain("type: research");
      expect(result.content[0].text).toContain("tags: api");
      expect(result.content[0].text).toContain("summary: API research");
    });

    it("returns 'No surfaces found' when empty", async () => {
      queryIndex.mockResolvedValue([]);

      const { surfaceList } = await import("../../tools/surface.js");
      const result = await surfaceList({});

      expect(result.content[0].text).toBe("No surfaces found.");
    });
  });

  describe("surfaceEnrich", () => {
    it("reads content, updates frontmatter, and writes back", async () => {
      execObsidian
        .mockResolvedValueOnce(
          "---\nproject: test-project\ncreated: 2025-01-01\nsummary: Old summary\n---\n\nBody content",
        )
        .mockResolvedValueOnce("Written");
      appendEntry.mockResolvedValue(undefined);

      const { surfaceEnrich } = await import("../../tools/surface.js");
      const result = await surfaceEnrich({
        path: "_surfaces/test-project/note.md",
        summary: "New summary",
        type: "decision",
        tags: ["updated"],
      });

      expect(result.content[0].text).toBe(
        "Enriched surface: _surfaces/test-project/note.md",
      );

      expect(execObsidian).toHaveBeenCalledTimes(2);
      const writeArgs = execObsidian.mock.calls[1][0];
      expect(writeArgs[0]).toBe("create");
      expect(writeArgs[1]).toContain("path=_surfaces/test-project/note.md");
      const writtenContent = writeArgs[2] as string;
      expect(writtenContent).toContain("summary: New summary");
      expect(writtenContent).toContain("type: decision");

      expect(appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "_surfaces/test-project/note.md",
          summary: "New summary",
          type: "decision",
          tags: ["updated"],
        }),
      );
    });

    it("returns error when content cannot be read", async () => {
      execObsidian.mockResolvedValueOnce("");

      const { surfaceEnrich } = await import("../../tools/surface.js");
      const result = await surfaceEnrich({
        path: "_surfaces/test-project/missing.md",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Could not read surface");
    });

    it("returns error when no frontmatter found", async () => {
      execObsidian.mockResolvedValueOnce("Content without frontmatter");

      const { surfaceEnrich } = await import("../../tools/surface.js");
      const result = await surfaceEnrich({
        path: "_surfaces/test-project/no-fm.md",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No frontmatter found");
    });
  });
});
