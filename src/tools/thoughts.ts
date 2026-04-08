import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { getProject, setProject } from "../state.js";
import { THOUGHTS_DIR, success, error } from "../types.js";
import {
  readIndex,
  appendEntry,
  updateEntry,
  removeEntries,
  reindex,
  parseFrontmatter,
  type IndexEntry,
} from "../index-manager.js";

export function register(server: McpServer): void {
  // ── existing tools (updated) ──────────────────────────────────────

  server.tool(
    "thought_create",
    "Record a research finding, design decision, comparison, or analysis to preserve context across sessions. Use this whenever you discover something worth remembering — the thoughts system is a running log, not a scratchpad.",
    {
      name: z.string().describe("Filename for the thought (without .md extension)"),
      content: z.string().describe("Markdown content of the thought"),
      summary: z.string().describe("One-line description for indexing"),
      type: z.string().optional().describe("Type of thought (e.g. research, design, comparison, decision, analysis, reference)"),
      tags: z.array(z.string()).optional().describe("Tags for the thought"),
      cwd_override: z.string().optional().describe("Override the working directory recorded in metadata (defaults to process.cwd())"),
    },
    async ({ name, content, summary, type, tags, cwd_override }) => {
      try {
        const project = getProject();
        const cwd = cwd_override || process.cwd();
        const now = new Date().toISOString().replace(/\.\d{3}Z$/, "");

        // Build frontmatter
        const frontmatter = [
          "---",
          `project: ${project}`,
          `created: ${now}`,
        ];
        if (type) frontmatter.push(`type: ${type}`);
        if (tags && tags.length > 0) {
          frontmatter.push(`tags: [${tags.join(", ")}]`);
        }
        frontmatter.push(`cwd: ${cwd}`);
        frontmatter.push(`summary: "${summary}"`);
        frontmatter.push("---");

        const fullContent = frontmatter.join("\n") + "\n\n" + content;
        const path = `${THOUGHTS_DIR}/${project}/${name}.md`;

        const result = await execObsidian([
          "create",
          `path=${path}`,
          `content=${fullContent}`,
          "open",
          "newtab",
        ]);

        // Update index
        const entry: IndexEntry = {
          path,
          project,
          created: now,
          type,
          tags,
          cwd,
          summary,
        };
        await appendEntry(entry);

        return success(result || `Created thought: ${path}`);
      } catch (e) {
        return error(`Failed to create thought: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "thought_list",
    "List thoughts in a project with metadata (date, type, tags, summary). Use this to review what's been captured for a specific project.",
    {
      project: z.string().optional().describe("Project name (defaults to active project)"),
    },
    async ({ project }) => {
      try {
        const proj = project || getProject();
        let entries = await readIndex();

        // If index is empty, try reindexing first
        if (entries.length === 0) {
          entries = await reindex();
        }

        const filtered = entries.filter((e) => e.project === proj);
        if (filtered.length === 0) return success("No thoughts found.");

        const lines = filtered.map(
          (e) =>
            `- **${e.path}** (${e.created})\n  type: ${e.type || "—"} | tags: ${e.tags?.join(", ") || "—"}\n  ${e.summary || ""}`
        );
        return success(lines.join("\n"));
      } catch (e) {
        return error(`Failed to list thoughts: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "thought_clear",
    "Delete all thoughts in a project. Use sparingly — thoughts are a running log and accumulate value over time.",
    {
      project: z.string().optional().describe("Project name (defaults to active project)"),
    },
    async ({ project }) => {
      try {
        const proj = project || getProject();
        const filesOutput = await execObsidian(["files", `folder=${THOUGHTS_DIR}/${proj}`]);
        if (!filesOutput) return success("No thoughts to clear.");

        const files = filesOutput.split("\n").filter(Boolean);
        let deleted = 0;
        for (const file of files) {
          const filePath = file.trim();
          if (filePath) {
            await execObsidian(["delete", `path=${filePath}`]);
            deleted++;
          }
        }

        // Clean index
        await removeEntries((e) => e.project === proj);

        return success(`Cleared ${deleted} thought(s) from project "${proj}".`);
      } catch (e) {
        return error(`Failed to clear thoughts: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "project_set",
    "Set the active project for thoughts",
    {
      name: z.string().describe("Project name"),
    },
    async ({ name }) => {
      setProject(name);
      return success(`Active project set to "${name}".`);
    }
  );

  server.tool(
    "project_list",
    "List all thought projects. Projects auto-derive from the working directory name.",
    {},
    async () => {
      try {
        const result = await execObsidian(["folders", `folder=${THOUGHTS_DIR}`]);
        const current = getProject();
        return success(`Active project: ${current}\n\nProjects:\n${result || "None"}`);
      } catch (e) {
        return error(`Failed to list projects: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "project_rename",
    "Rename a thought project",
    {
      from: z.string().describe("Current project name"),
      to: z.string().describe("New project name"),
    },
    async ({ from, to }) => {
      try {
        const filesOutput = await execObsidian(["files", `folder=${THOUGHTS_DIR}/${from}`]);
        if (!filesOutput) return success(`Project "${from}" is empty or does not exist.`);

        const files = filesOutput.split("\n").filter(Boolean);
        for (const file of files) {
          const filename = file.trim().split("/").pop();
          if (filename) {
            await execObsidian([
              "move",
              `path=${THOUGHTS_DIR}/${from}/${filename}`,
              `to=${THOUGHTS_DIR}/${to}/${filename}`,
            ]);
          }
        }

        if (getProject() === from) setProject(to);
        return success(`Renamed project "${from}" to "${to}" (${files.length} file(s) moved).`);
      } catch (e) {
        return error(`Failed to rename project: ${(e as Error).message}`);
      }
    }
  );

  // ── new tools ─────────────────────────────────────────────────────

  server.tool(
    "thought_index",
    "Get the full frontmatter index of all thoughts across all projects. Returns metadata only (no content) — use this at the start of a session to understand what prior knowledge exists. Call note_read on specific thoughts to get full content.",
    {
      project: z.string().optional().describe("Filter by project name"),
      type: z.string().optional().describe("Filter by thought type"),
      tags: z.array(z.string()).optional().describe("Filter by tags (matches if thought has ANY of the listed tags)"),
      since: z.string().optional().describe("Only return thoughts created after this ISO date"),
      query: z.string().optional().describe("Substring match on summary"),
    },
    async ({ project, type, tags, since, query }) => {
      try {
        let entries = await readIndex();

        // If index is empty, try building it
        if (entries.length === 0) {
          entries = await reindex();
        }

        // Apply filters
        if (project) entries = entries.filter((e) => e.project === project);
        if (type) entries = entries.filter((e) => e.type === type);
        if (tags && tags.length > 0) {
          entries = entries.filter(
            (e) => e.tags && tags.some((t) => e.tags!.includes(t))
          );
        }
        if (since) entries = entries.filter((e) => e.created >= since);
        if (query) {
          const q = query.toLowerCase();
          entries = entries.filter(
            (e) => e.summary && e.summary.toLowerCase().includes(q)
          );
        }

        if (entries.length === 0) return success("No thoughts match the filters.");
        return success(JSON.stringify(entries, null, 2));
      } catch (e) {
        return error(`Failed to read index: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "thought_recent",
    "Get the N most recent thoughts across all projects. Use this to quickly catch up on recent work.",
    {
      limit: z.number().optional().describe("Number of thoughts to return (default 20)"),
      project: z.string().optional().describe("Filter by project name"),
    },
    async ({ limit, project }) => {
      try {
        let entries = await readIndex();

        if (entries.length === 0) {
          entries = await reindex();
        }

        if (project) entries = entries.filter((e) => e.project === project);

        const sliced = entries.slice(0, limit || 20);
        if (sliced.length === 0) return success("No recent thoughts.");
        return success(JSON.stringify(sliced, null, 2));
      } catch (e) {
        return error(`Failed to get recent thoughts: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "thought_enrich",
    "Update a thought's frontmatter metadata without changing its content. Use this to refine summaries, add tags, or update type after the fact.",
    {
      path: z.string().describe("Path to the thought file (e.g. _thoughts/project/name.md)"),
      summary: z.string().optional().describe("New summary"),
      type: z.string().optional().describe("New type"),
      tags: z.array(z.string()).optional().describe("New tags (replaces existing)"),
    },
    async ({ path, summary, type, tags }) => {
      try {
        // Read current file
        const content = await execObsidian(["read", `path=${path}`]);

        // Parse existing frontmatter and body
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
        if (!fmMatch) {
          return error("Could not parse frontmatter from the file.");
        }

        const fm = parseFrontmatter(content);
        const body = fmMatch[2];

        // Apply updates
        if (summary !== undefined) fm.summary = `"${summary}"`;
        if (type !== undefined) fm.type = type;
        if (tags !== undefined) fm.tags = tags;

        // Rebuild frontmatter
        const lines = ["---"];
        for (const [key, val] of Object.entries(fm)) {
          if (Array.isArray(val)) {
            lines.push(`${key}: [${val.join(", ")}]`);
          } else {
            lines.push(`${key}: ${val}`);
          }
        }
        lines.push("---");

        const newContent = lines.join("\n") + "\n" + body;
        await execObsidian(["create", `path=${path}`, `content=${newContent}`, "overwrite"]);

        // Update index
        const indexUpdates: Partial<IndexEntry> = {};
        if (summary !== undefined) indexUpdates.summary = summary;
        if (type !== undefined) indexUpdates.type = type;
        if (tags !== undefined) indexUpdates.tags = tags;
        await updateEntry(path, indexUpdates);

        return success(`Enriched: ${path}`);
      } catch (e) {
        return error(`Failed to enrich thought: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "thought_reindex",
    "Rebuild the frontmatter index by scanning all thought files. Use this if thoughts were created or edited manually in Obsidian.",
    {},
    async () => {
      try {
        const entries = await reindex();
        return success(`Reindexed ${entries.length} thought(s).`);
      } catch (e) {
        return error(`Failed to reindex: ${(e as Error).message}`);
      }
    }
  );
}
