import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the cli module
vi.mock("../cli.js", () => ({
  execObsidian: vi.fn(),
  detectWSL: vi.fn(() => Promise.resolve(false)),
}));

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

describe("index-manager", () => {
  let execObsidian: ReturnType<typeof vi.fn>;
  let readFile: ReturnType<typeof vi.fn>;
  let writeFile: ReturnType<typeof vi.fn>;
  let mkdir: ReturnType<typeof vi.fn>;
  let readdir: ReturnType<typeof vi.fn>;
  let statFn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();

    const cli = await import("../cli.js");
    const fs = await import("node:fs/promises");
    execObsidian = vi.mocked(cli.execObsidian);
    readFile = vi.mocked(fs.readFile);
    writeFile = vi.mocked(fs.writeFile);
    mkdir = vi.mocked(fs.mkdir);
    readdir = vi.mocked(fs.readdir);
    statFn = vi.mocked(fs.stat);

    // Default: execObsidian returns vault path
    execObsidian.mockResolvedValue("path\t/vault");
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);
  });

  function seedIndex(entries: any[]) {
    const index = {
      version: 1,
      updated: "2025-01-01T00:00:00.000Z",
      entries,
    };
    // First readFile call is for the index
    readFile.mockResolvedValue(JSON.stringify(index));
  }

  describe("appendEntry", () => {
    it("adds a new entry to the index", async () => {
      seedIndex([]);
      const { appendEntry } = await import("../index-manager.js");

      await appendEntry({
        path: "_surfaces/proj/note.md",
        project: "proj",
        created: "2025-01-01",
      });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining("_index.json"),
        expect.stringContaining("_surfaces/proj/note.md"),
        "utf-8",
      );
    });

    it("deduplicates by path (replaces existing)", async () => {
      seedIndex([
        {
          path: "_surfaces/proj/note.md",
          project: "proj",
          created: "2025-01-01",
          summary: "old",
        },
      ]);
      const { appendEntry } = await import("../index-manager.js");

      await appendEntry({
        path: "_surfaces/proj/note.md",
        project: "proj",
        created: "2025-01-02",
        summary: "new",
      });

      const writtenData = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string,
      );
      expect(writtenData.entries).toHaveLength(1);
      expect(writtenData.entries[0].summary).toBe("new");
      expect(writtenData.entries[0].created).toBe("2025-01-02");
    });
  });

  describe("removeEntriesByProject", () => {
    it("removes entries matching the project", async () => {
      seedIndex([
        { path: "a.md", project: "alpha", created: "2025-01-01" },
        { path: "b.md", project: "beta", created: "2025-01-01" },
        { path: "c.md", project: "alpha", created: "2025-01-02" },
      ]);
      const { removeEntriesByProject } = await import("../index-manager.js");

      const count = await removeEntriesByProject("alpha");

      expect(count).toBe(2);
      const writtenData = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string,
      );
      expect(writtenData.entries).toHaveLength(1);
      expect(writtenData.entries[0].project).toBe("beta");
    });

    it("returns 0 and does not write when no entries match", async () => {
      seedIndex([{ path: "a.md", project: "beta", created: "2025-01-01" }]);
      const { removeEntriesByProject } = await import("../index-manager.js");

      const count = await removeEntriesByProject("alpha");

      expect(count).toBe(0);
      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe("queryIndex", () => {
    const entries = [
      {
        path: "_surfaces/proj-a/note1.md",
        project: "proj-a",
        created: "2025-01-01",
        type: "research",
        tags: ["api", "design"],
        summary: "API design notes",
      },
      {
        path: "_surfaces/proj-b/note2.md",
        project: "proj-b",
        created: "2025-06-15",
        type: "decision",
        tags: ["architecture"],
        summary: "Architecture decision",
      },
      {
        path: "_surfaces/proj-a/note3.md",
        project: "proj-a",
        created: "2025-03-01",
        type: "research",
        tags: ["testing"],
        summary: "Testing strategy",
      },
    ];

    it("filters by project", async () => {
      seedIndex(entries);
      const { queryIndex } = await import("../index-manager.js");
      const results = await queryIndex({ project: "proj-a" });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.project === "proj-a")).toBe(true);
    });

    it("filters by type", async () => {
      seedIndex(entries);
      const { queryIndex } = await import("../index-manager.js");
      const results = await queryIndex({ type: "decision" });
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("decision");
    });

    it("filters by tags", async () => {
      seedIndex(entries);
      const { queryIndex } = await import("../index-manager.js");
      const results = await queryIndex({ tags: ["api", "testing"] });
      expect(results).toHaveLength(2);
    });

    it("filters by since date", async () => {
      seedIndex(entries);
      const { queryIndex } = await import("../index-manager.js");
      const results = await queryIndex({ since: "2025-03-01" });
      expect(results).toHaveLength(2);
    });

    it("filters by query string", async () => {
      seedIndex(entries);
      const { queryIndex } = await import("../index-manager.js");
      const results = await queryIndex({ query: "architecture" });
      expect(results).toHaveLength(1);
      expect(results[0].summary).toBe("Architecture decision");
    });

    it("returns all entries when no filters provided", async () => {
      seedIndex(entries);
      const { queryIndex } = await import("../index-manager.js");
      const results = await queryIndex();
      expect(results).toHaveLength(3);
    });

    it("combines multiple filters", async () => {
      seedIndex(entries);
      const { queryIndex } = await import("../index-manager.js");
      const results = await queryIndex({
        project: "proj-a",
        type: "research",
      });
      expect(results).toHaveLength(2);
    });
  });

  describe("recentEntries", () => {
    it("returns entries in descending order by created date", async () => {
      seedIndex([
        { path: "a.md", project: "p", created: "2025-01-01" },
        { path: "c.md", project: "p", created: "2025-03-01" },
        { path: "b.md", project: "p", created: "2025-02-01" },
      ]);
      const { recentEntries } = await import("../index-manager.js");
      const results = await recentEntries(10);

      expect(results[0].created).toBe("2025-03-01");
      expect(results[1].created).toBe("2025-02-01");
      expect(results[2].created).toBe("2025-01-01");
    });

    it("respects the limit parameter", async () => {
      seedIndex([
        { path: "a.md", project: "p", created: "2025-01-01" },
        { path: "b.md", project: "p", created: "2025-02-01" },
        { path: "c.md", project: "p", created: "2025-03-01" },
      ]);
      const { recentEntries } = await import("../index-manager.js");
      const results = await recentEntries(2);
      expect(results).toHaveLength(2);
    });
  });

  describe("reindex", () => {
    it("scans files and builds index from frontmatter", async () => {
      // readdir for thoughtsRoot returns project dirs
      readdir.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("_surfaces")) return ["project-a"] as any;
        if (p.endsWith("project-a")) return ["note1.md"] as any;
        return [] as any;
      });
      statFn.mockResolvedValue({ isDirectory: () => true } as any);
      readFile.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("note1.md")) {
          return "---\nproject: project-a\ncreated: 2025-01-01\nsummary: Test note\ntags: [api, design]\n---\n\nContent here" as any;
        }
        throw new Error("ENOENT");
      });

      const { reindex } = await import("../index-manager.js");
      const count = await reindex();

      expect(count).toBe(1);
      expect(writeFile).toHaveBeenCalled();
      const writtenData = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string,
      );
      expect(writtenData.entries[0].project).toBe("project-a");
      expect(writtenData.entries[0].tags).toEqual(["api", "design"]);
    });

    it("skips underscore-prefixed directories", async () => {
      readdir.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("_surfaces"))
          return ["_internal", "valid-project"] as any;
        if (p.endsWith("valid-project")) return ["note.md"] as any;
        return [] as any;
      });
      statFn.mockResolvedValue({ isDirectory: () => true } as any);
      readFile.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("note.md")) {
          return "---\nproject: valid-project\ncreated: 2025-01-01\n---\n\nContent" as any;
        }
        throw new Error("ENOENT");
      });

      const { reindex } = await import("../index-manager.js");
      const count = await reindex();
      expect(count).toBe(1);
    });

    it("skips underscore-prefixed files", async () => {
      readdir.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("_surfaces")) return ["project"] as any;
        if (p.endsWith("project")) return ["_hidden.md", "visible.md"] as any;
        return [] as any;
      });
      statFn.mockResolvedValue({ isDirectory: () => true } as any);
      readFile.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("visible.md")) {
          return "---\nproject: project\ncreated: 2025-01-01\n---\n\nContent" as any;
        }
        throw new Error("ENOENT");
      });

      const { reindex } = await import("../index-manager.js");
      const count = await reindex();
      expect(count).toBe(1);
    });

    it("returns 0 when thoughts directory does not exist", async () => {
      readdir.mockRejectedValue(new Error("ENOENT"));

      const { reindex } = await import("../index-manager.js");
      const count = await reindex();
      expect(count).toBe(0);
    });
  });

  describe("parseFrontmatter (via reindex)", () => {
    beforeEach(() => {
      statFn.mockResolvedValue({ isDirectory: () => true } as any);
    });

    it("parses standard YAML frontmatter", async () => {
      readdir.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("_surfaces")) return ["proj"] as any;
        if (p.endsWith("proj")) return ["note.md"] as any;
        return [] as any;
      });
      readFile.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("note.md")) {
          return "---\nproject: my-project\ncreated: 2025-06-01\ntype: research\nsummary: A summary\n---\n\nBody" as any;
        }
        throw new Error("ENOENT");
      });

      const { reindex } = await import("../index-manager.js");
      await reindex();

      const writtenData = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string,
      );
      const entry = writtenData.entries[0];
      expect(entry.project).toBe("my-project");
      expect(entry.type).toBe("research");
      expect(entry.summary).toBe("A summary");
    });

    it("parses array values in frontmatter", async () => {
      readdir.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("_surfaces")) return ["proj"] as any;
        if (p.endsWith("proj")) return ["note.md"] as any;
        return [] as any;
      });
      readFile.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("note.md")) {
          return "---\nproject: proj\ncreated: 2025-01-01\ntags: [tag1, tag2, tag3]\n---\n\nBody" as any;
        }
        throw new Error("ENOENT");
      });

      const { reindex } = await import("../index-manager.js");
      await reindex();

      const writtenData = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string,
      );
      expect(writtenData.entries[0].tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("handles empty frontmatter", async () => {
      readdir.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("_surfaces")) return ["proj"] as any;
        if (p.endsWith("proj")) return ["note.md"] as any;
        return [] as any;
      });
      readFile.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("note.md")) {
          return "---\n---\n\nBody content" as any;
        }
        throw new Error("ENOENT");
      });

      const { reindex } = await import("../index-manager.js");
      await reindex();

      const writtenData = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string,
      );
      const entry = writtenData.entries[0];
      // Falls back to directory name for project
      expect(entry.project).toBe("proj");
    });

    it("handles content with no frontmatter", async () => {
      readdir.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("_surfaces")) return ["proj"] as any;
        if (p.endsWith("proj")) return ["note.md"] as any;
        return [] as any;
      });
      readFile.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("note.md")) {
          return "Just plain content without frontmatter" as any;
        }
        throw new Error("ENOENT");
      });

      const { reindex } = await import("../index-manager.js");
      await reindex();

      const writtenData = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string,
      );
      const entry = writtenData.entries[0];
      // Falls back to directory name
      expect(entry.project).toBe("proj");
      expect(entry.type).toBeUndefined();
      expect(entry.tags).toBeUndefined();
    });

    it("handles quoted values in frontmatter", async () => {
      readdir.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("_surfaces")) return ["proj"] as any;
        if (p.endsWith("proj")) return ["note.md"] as any;
        return [] as any;
      });
      readFile.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("note.md")) {
          return '---\nproject: proj\ncreated: 2025-01-01\nsummary: "A quoted summary"\n---\n\nBody' as any;
        }
        throw new Error("ENOENT");
      });

      const { reindex } = await import("../index-manager.js");
      await reindex();

      const writtenData = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string,
      );
      expect(writtenData.entries[0].summary).toBe('"A quoted summary"');
    });

    it("handles malformed frontmatter (missing closing ---)", async () => {
      readdir.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("_surfaces")) return ["proj"] as any;
        if (p.endsWith("proj")) return ["note.md"] as any;
        return [] as any;
      });
      readFile.mockImplementation(async (path: any) => {
        const p = String(path);
        if (p.endsWith("note.md")) {
          return "---\nproject: proj\ncreated: 2025-01-01\nThis content never closes" as any;
        }
        throw new Error("ENOENT");
      });

      const { reindex } = await import("../index-manager.js");
      await reindex();

      const writtenData = JSON.parse(
        vi.mocked(writeFile).mock.calls[0][1] as string,
      );
      const entry = writtenData.entries[0];
      // No frontmatter parsed, falls back to directory name
      expect(entry.project).toBe("proj");
    });
  });
});
