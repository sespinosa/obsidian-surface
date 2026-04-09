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
  SURFACES_DIR,
  type ToolResult,
  validatePath,
} from "../types.js";

// --- Handler functions ---

export async function surfaceCreate(p: {
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
  const path = `${SURFACES_DIR}/${project}/${p.name}.md`;

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

  return success(result || `Created surface: ${path}`);
}

export async function surfaceList(p: {
  project?: string;
}): Promise<ToolResult> {
  const proj = p.project || getProject();
  const entries = await queryIndex({ project: proj });

  if (entries.length === 0) return success("No surfaces found.");

  const lines = entries.map((e) => {
    const parts = [e.path, `created: ${e.created}`];
    if (e.type) parts.push(`type: ${e.type}`);
    if (e.tags?.length) parts.push(`tags: ${e.tags.join(", ")}`);
    if (e.summary) parts.push(`summary: ${e.summary}`);
    return parts.join(" | ");
  });
  return success(lines.join("\n"));
}

export async function surfaceIndex(p: {
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

export async function surfaceRecent(p: {
  limit?: number;
}): Promise<ToolResult> {
  const entries = await recentEntries(p.limit || 10);
  if (entries.length === 0) return success("No recent surfaces found.");
  return success(JSON.stringify(entries, null, 2));
}

export async function surfaceEnrich(p: {
  path: string;
  type?: string;
  tags?: string[];
  summary?: string;
}): Promise<ToolResult> {
  p.path = validatePath(p.path);
  const content = await execObsidian(["read", `path=${p.path}`]);
  if (!content) return error(`Could not read surface at ${p.path}`);

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return error("No frontmatter found in surface.");

  const body = content.slice(fmMatch[0].length);
  const fmLines = fmMatch[1].split("\n");
  const fm: Record<string, string> = {};
  for (const line of fmLines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx >= 0) {
      fm[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
  }

  if (p.type) fm.type = p.type;
  if (p.summary) fm.summary = p.summary;
  if (p.tags && p.tags.length > 0) {
    fm.tags = `[${p.tags.join(", ")}]`;
  }

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

  return success(`Enriched surface: ${p.path}`);
}

export async function surfaceReindex(): Promise<ToolResult> {
  const count = await rebuildIndex();
  return success(`Reindexed ${count} surface(s).`);
}

export async function surfaceClear(p: {
  project?: string;
}): Promise<ToolResult> {
  const proj = p.project || getProject();
  const filesOutput = await execObsidian([
    "files",
    `folder=${SURFACES_DIR}/${proj}`,
  ]);
  if (!filesOutput) return success("No surfaces to clear.");

  const files = filesOutput.split("\n").filter(Boolean);
  let deleted = 0;
  for (const file of files) {
    const filePath = file.trim();
    if (filePath) {
      await execObsidian(["delete", `path=${filePath}`]);
      deleted++;
    }
  }

  await removeEntriesByProject(proj);

  return success(`Cleared ${deleted} surface(s) from project "${proj}".`);
}

export async function projectSet(p: { name: string }): Promise<ToolResult> {
  setProject(p.name);
  return success(`Active project set to "${p.name}".`);
}

export async function projectList(): Promise<ToolResult> {
  const result = await execObsidian(["folders", `folder=${SURFACES_DIR}`]);
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
    `folder=${SURFACES_DIR}/${p.from}`,
  ]);
  if (!filesOutput)
    return success(`Project "${p.from}" is empty or does not exist.`);

  const files = filesOutput.split("\n").filter(Boolean);
  for (const file of files) {
    const filename = file.trim().split("/").pop();
    if (filename) {
      await execObsidian([
        "move",
        `path=${SURFACES_DIR}/${p.from}/${filename}`,
        `to=${SURFACES_DIR}/${p.to}/${filename}`,
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
  create: surfaceCreate,
  list: surfaceList,
  index: surfaceIndex,
  recent: surfaceRecent,
  enrich: surfaceEnrich,
  reindex: surfaceReindex,
  clear: surfaceClear,
  project_set: projectSet,
  project_list: projectList,
  project_rename: projectRename,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "surface",
    `Create and manage display surfaces — rich rendered artifacts (documents, diagrams, tables, comparisons) shown to the user in Obsidian. Surfaces persist as a timeline of what was communicated across sessions. Use \`create\` whenever rendering in Obsidian is better than terminal text. Use \`index\` at session start to discover prior surfaces.

Actions:
- create: Create a surface with frontmatter and open it in Obsidian (name, content, summary required; type, tags, cwd_override optional)
- list: List surfaces in a project with metadata (project optional, defaults to active)
- index: Query the frontmatter index (project, type, tags, since, query — all optional filters)
- recent: Get N most recent surfaces across all projects (limit optional, default 10)
- enrich: Update a surface's frontmatter without changing content (path required; type, tags, summary optional)
- reindex: Rebuild the index by scanning all surface files (no params)
- clear: Delete all surfaces in a project and remove from index (project optional)
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
      name: z.string().optional().describe("Surface filename or project name"),
      content: z
        .string()
        .optional()
        .describe("Markdown content of the surface"),
      summary: z
        .string()
        .optional()
        .describe("Brief summary of the surface (for create, enrich)"),
      type: z
        .string()
        .optional()
        .describe("Type of surface (e.g. research, design, comparison, diagram)"),
      tags: z.array(z.string()).optional().describe("Tags for the surface"),
      project: z
        .string()
        .optional()
        .describe("Project name (defaults to active project)"),
      from: z.string().optional().describe("Current project name (for rename)"),
      to: z.string().optional().describe("New project name (for rename)"),
      path: z.string().optional().describe("Path to a surface (for enrich)"),
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
          `surface.${params.action} failed: ${(e as Error).message}`,
        );
      }
    },
  );
}
