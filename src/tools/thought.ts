import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execObsidian } from "../cli.js";
import {
  appendEntry,
  queryIndex,
  reindex as rebuildIndex,
  recentEntries,
  removeEntriesByProject,
} from "../index-manager.js";
import { getProject, setProject } from "../state.js";
import {
  error,
  success,
  THOUGHTS_DIR,
  type ToolResult,
  validatePath,
} from "../types.js";

// --- Handler functions ---

export async function thoughtCreate(p: {
  name: string;
  content: string;
  summary: string;
  type?: string;
  tags?: string[];
  cwd_override?: string;
}): Promise<ToolResult> {
  const project = getProject();
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "");
  const cwd = p.cwd_override || process.cwd();

  const frontmatter = [
    "---",
    `project: ${project}`,
    `created: ${now}`,
    `summary: ${p.summary}`,
    `cwd: ${cwd}`,
  ];
  if (p.type) frontmatter.push(`type: ${p.type}`);
  if (p.tags && p.tags.length > 0) {
    frontmatter.push(`tags: [${p.tags.join(", ")}]`);
  }
  frontmatter.push("---");

  const fullContent = `${frontmatter.join("\n")}\n\n${p.content}`;
  const path = `${THOUGHTS_DIR}/${project}/${p.name}.md`;

  const result = await execObsidian([
    "create",
    `path=${path}`,
    `content=${fullContent}`,
    "open",
    "newtab",
  ]);

  // Append to index
  await appendEntry({
    path,
    project,
    created: now,
    type: p.type,
    tags: p.tags,
    summary: p.summary,
    cwd,
  });

  return success(result || `Created thought: ${path}`);
}

export async function thoughtList(p: {
  project?: string;
}): Promise<ToolResult> {
  const proj = p.project || getProject();
  const entries = await queryIndex({ project: proj });

  if (entries.length === 0) return success("No thoughts found.");

  const lines = entries.map((e) => {
    const parts = [e.path, `created: ${e.created}`];
    if (e.type) parts.push(`type: ${e.type}`);
    if (e.tags?.length) parts.push(`tags: ${e.tags.join(", ")}`);
    if (e.summary) parts.push(`summary: ${e.summary}`);
    return parts.join(" | ");
  });
  return success(lines.join("\n"));
}

export async function thoughtIndex(p: {
  project?: string;
  type?: string;
  tags?: string[];
  since?: string;
  query?: string;
}): Promise<ToolResult> {
  const entries = await queryIndex({
    project: p.project,
    type: p.type,
    tags: p.tags,
    since: p.since,
    query: p.query,
  });
  return success(JSON.stringify(entries, null, 2));
}

export async function thoughtRecent(p: {
  limit?: number;
}): Promise<ToolResult> {
  const entries = await recentEntries(p.limit || 10);
  if (entries.length === 0) return success("No recent thoughts found.");
  return success(JSON.stringify(entries, null, 2));
}

export async function thoughtEnrich(p: {
  path: string;
  type?: string;
  tags?: string[];
  summary?: string;
}): Promise<ToolResult> {
  p.path = validatePath(p.path);
  // Read existing content
  const content = await execObsidian(["read", `path=${p.path}`]);
  if (!content) return error(`Could not read thought at ${p.path}`);

  // Parse existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return error("No frontmatter found in thought.");

  const body = content.slice(fmMatch[0].length);
  const fmLines = fmMatch[1].split("\n");
  const fm: Record<string, string> = {};
  for (const line of fmLines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx >= 0) {
      fm[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
  }

  // Update fields
  if (p.type) fm.type = p.type;
  if (p.summary) fm.summary = p.summary;
  if (p.tags && p.tags.length > 0) {
    fm.tags = `[${p.tags.join(", ")}]`;
  }

  // Rebuild frontmatter
  const newFm = Object.entries(fm)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const newContent = `---\n${newFm}\n---${body}`;

  await execObsidian([
    "create",
    `path=${p.path}`,
    `content=${newContent}`,
    "overwrite",
  ]);

  // Update index entry
  const tagsArray =
    p.tags ||
    (fm.tags
      ? fm.tags
          .replace(/[[\]]/g, "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined);
  await appendEntry({
    path: p.path,
    project: fm.project || getProject(),
    created: fm.created || new Date().toISOString(),
    type: p.type || fm.type,
    tags: tagsArray,
    summary: p.summary || fm.summary,
    cwd: fm.cwd,
  });

  return success(`Enriched thought: ${p.path}`);
}

export async function thoughtReindex(): Promise<ToolResult> {
  const count = await rebuildIndex();
  return success(`Reindexed ${count} thought(s).`);
}

export async function thoughtClear(p: {
  project?: string;
}): Promise<ToolResult> {
  const proj = p.project || getProject();
  const filesOutput = await execObsidian([
    "files",
    `folder=${THOUGHTS_DIR}/${proj}`,
  ]);
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

  // Remove from index
  await removeEntriesByProject(proj);

  return success(`Cleared ${deleted} thought(s) from project "${proj}".`);
}

export async function projectSet(p: { name: string }): Promise<ToolResult> {
  setProject(p.name);
  return success(`Active project set to "${p.name}".`);
}

export async function projectList(): Promise<ToolResult> {
  const result = await execObsidian(["folders", `folder=${THOUGHTS_DIR}`]);
  const current = getProject();
  return success(
    `Active project: ${current}\n\nProjects:\n${result || "None"}`,
  );
}

export async function projectRename(p: {
  from: string;
  to: string;
}): Promise<ToolResult> {
  const filesOutput = await execObsidian([
    "files",
    `folder=${THOUGHTS_DIR}/${p.from}`,
  ]);
  if (!filesOutput)
    return success(`Project "${p.from}" is empty or does not exist.`);

  const files = filesOutput.split("\n").filter(Boolean);
  for (const file of files) {
    const filename = file.trim().split("/").pop();
    if (filename) {
      await execObsidian([
        "move",
        `path=${THOUGHTS_DIR}/${p.from}/${filename}`,
        `to=${THOUGHTS_DIR}/${p.to}/${filename}`,
      ]);
    }
  }

  if (getProject() === p.from) setProject(p.to);
  return success(
    `Renamed project "${p.from}" to "${p.to}" (${files.length} file(s) moved).`,
  );
}

// --- Handler map ---

export const handlers: Record<string, (p: any) => Promise<ToolResult>> = {
  create: thoughtCreate,
  list: thoughtList,
  index: thoughtIndex,
  recent: thoughtRecent,
  enrich: thoughtEnrich,
  reindex: thoughtReindex,
  clear: thoughtClear,
  project_set: projectSet,
  project_list: projectList,
  project_rename: projectRename,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "thought",
    `Manage the thoughts system — a running log of research, decisions, and analysis that persists across sessions. Use \`create\` to capture context worth preserving. Use \`index\` at session start to discover prior knowledge.

Actions:
- create: Create a thought with frontmatter (name, content, summary required; type, tags, cwd_override optional)
- list: List thoughts in a project with metadata (project optional, defaults to active)
- index: Query the frontmatter index (project, type, tags, since, query — all optional filters)
- recent: Get N most recent thoughts across all projects (limit optional, default 10)
- enrich: Update a thought's frontmatter without changing content (path required; type, tags, summary optional)
- reindex: Rebuild the index by scanning all thought files (no params)
- clear: Delete all thoughts in a project and remove from index (project optional)
- project_set: Set active project (name required)
- project_list: List all projects (no params)
- project_rename: Rename a project (from, to required)`,
    {
      action: z
        .enum([
          "create",
          "list",
          "index",
          "recent",
          "enrich",
          "reindex",
          "clear",
          "project_set",
          "project_list",
          "project_rename",
        ])
        .describe("Action to perform"),
      name: z.string().optional().describe("Thought filename or project name"),
      content: z
        .string()
        .optional()
        .describe("Markdown content of the thought"),
      summary: z
        .string()
        .optional()
        .describe("Brief summary of the thought (for create, enrich)"),
      type: z
        .string()
        .optional()
        .describe("Type of thought (e.g. research, design)"),
      tags: z.array(z.string()).optional().describe("Tags for the thought"),
      project: z
        .string()
        .optional()
        .describe("Project name (defaults to active project)"),
      from: z.string().optional().describe("Current project name (for rename)"),
      to: z.string().optional().describe("New project name (for rename)"),
      path: z.string().optional().describe("Path to a thought (for enrich)"),
      since: z
        .string()
        .optional()
        .describe("ISO date filter for index (e.g. 2025-01-01)"),
      query: z.string().optional().describe("Text search filter for index"),
      limit: z
        .number()
        .optional()
        .describe("Max results for recent (default 10)"),
      cwd_override: z
        .string()
        .optional()
        .describe("Override working directory recorded in frontmatter"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(
          `thought.${params.action} failed: ${(e as Error).message}`,
        );
      }
    },
  );
}
