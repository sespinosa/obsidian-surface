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

describe("thought handlers", () => {
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

  describe("thoughtCreate", () => {
    it("calls execObsidian with correct arguments", async () => {
      execObsidian.mockResolvedValue("Created");
      appendEntry.mockResolvedValue(undefined);

      const { thoughtCreate } = await import("../../tools/thought.js");
      const result = await thoughtCreate({
        name: "my-thought",
        content: "Some content",
        summary: "A summary",
      });

      expect(execObsidian).toHaveBeenCalledWith([
        "create",
        expect.stringContaining("path=_thoughts/test-project/my-thought.md"),
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

      const { thoughtCreate } = await import("../../tools/thought.js");
      await thoughtCreate({
        name: "tagged-thought",
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

      const { thoughtCreate } = await import("../../tools/thought.js");
      await thoughtCreate({
        name: "indexed-thought",
        content: "Content",
        summary: "My summary",
        type: "decision",
        tags: ["tag1"],
      });

      expect(appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "_thoughts/test-project/indexed-thought.md",
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

      const { thoughtCreate } = await import("../../tools/thought.js");
      const result = await thoughtCreate({
        name: "empty-result",
        content: "Content",
        summary: "Summary",
      });

      expect(result.content[0].text).toContain("Created thought:");
    });
  });

  describe("thoughtList", () => {
    it("formats entries into a readable list", async () => {
      queryIndex.mockResolvedValue([
        {
          path: "_thoughts/test-project/note1.md",
          project: "test-project",
          created: "2025-01-01",
          type: "research",
          tags: ["api"],
          summary: "API research",
        },
      ]);

      const { thoughtList } = await import("../../tools/thought.js");
      const result = await thoughtList({});

      expect(result.content[0].text).toContain(
        "_thoughts/test-project/note1.md",
      );
      expect(result.content[0].text).toContain("type: research");
      expect(result.content[0].text).toContain("tags: api");
      expect(result.content[0].text).toContain("summary: API research");
    });

    it("returns 'No thoughts found' when empty", async () => {
      queryIndex.mockResolvedValue([]);

      const { thoughtList } = await import("../../tools/thought.js");
      const result = await thoughtList({});

      expect(result.content[0].text).toBe("No thoughts found.");
    });
  });

  describe("thoughtEnrich", () => {
    it("reads content, updates frontmatter, and writes back", async () => {
      execObsidian
        .mockResolvedValueOnce(
          "---\nproject: test-project\ncreated: 2025-01-01\nsummary: Old summary\n---\n\nBody content",
        )
        .mockResolvedValueOnce("Written");
      appendEntry.mockResolvedValue(undefined);

      const { thoughtEnrich } = await import("../../tools/thought.js");
      const result = await thoughtEnrich({
        path: "_thoughts/test-project/note.md",
        summary: "New summary",
        type: "decision",
        tags: ["updated"],
      });

      expect(result.content[0].text).toBe(
        "Enriched thought: _thoughts/test-project/note.md",
      );

      // Verify the write call
      expect(execObsidian).toHaveBeenCalledTimes(2);
      const writeArgs = execObsidian.mock.calls[1][0];
      expect(writeArgs[0]).toBe("create");
      expect(writeArgs[1]).toContain("path=_thoughts/test-project/note.md");
      const writtenContent = writeArgs[2] as string;
      expect(writtenContent).toContain("summary: New summary");
      expect(writtenContent).toContain("type: decision");

      // Verify appendEntry called
      expect(appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "_thoughts/test-project/note.md",
          summary: "New summary",
          type: "decision",
          tags: ["updated"],
        }),
      );
    });

    it("returns error when content cannot be read", async () => {
      execObsidian.mockResolvedValueOnce("");

      const { thoughtEnrich } = await import("../../tools/thought.js");
      const result = await thoughtEnrich({
        path: "_thoughts/test-project/missing.md",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Could not read thought");
    });

    it("returns error when no frontmatter found", async () => {
      execObsidian.mockResolvedValueOnce("Content without frontmatter");

      const { thoughtEnrich } = await import("../../tools/thought.js");
      const result = await thoughtEnrich({
        path: "_thoughts/test-project/no-fm.md",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No frontmatter found");
    });
  });
});
