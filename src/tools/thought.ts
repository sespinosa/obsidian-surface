import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { getProject, setProject } from "../state.js";
import { THOUGHTS_DIR, success, error, type ToolResult } from "../types.js";

// --- Handler functions ---

export async function thoughtCreate(p: {
  name: string;
  content: string;
  type?: string;
  tags?: string[];
}): Promise<ToolResult> {
  const project = getProject();
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "");

  const frontmatter = ["---", `project: ${project}`, `created: ${now}`];
  if (p.type) frontmatter.push(`type: ${p.type}`);
  if (p.tags && p.tags.length > 0) {
    frontmatter.push(`tags: [${p.tags.join(", ")}]`);
  }
  frontmatter.push("---");

  const fullContent = frontmatter.join("\n") + "\n\n" + p.content;
  const path = `${THOUGHTS_DIR}/${project}/${p.name}.md`;

  const result = await execObsidian([
    "create",
    `path=${path}`,
    `content=${fullContent}`,
    "open",
    "newtab",
  ]);
  return success(result || `Created thought: ${path}`);
}

export async function thoughtList(p: { project?: string }): Promise<ToolResult> {
  const proj = p.project || getProject();
  const result = await execObsidian(["files", `folder=${THOUGHTS_DIR}/${proj}`]);
  return success(result || "No thoughts found.");
}

export async function thoughtClear(p: { project?: string }): Promise<ToolResult> {
  const proj = p.project || getProject();
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
  return success(`Cleared ${deleted} thought(s) from project "${proj}".`);
}

export async function projectSet(p: { name: string }): Promise<ToolResult> {
  setProject(p.name);
  return success(`Active project set to "${p.name}".`);
}

export async function projectList(): Promise<ToolResult> {
  const result = await execObsidian(["folders", `folder=${THOUGHTS_DIR}`]);
  const current = getProject();
  return success(`Active project: ${current}\n\nProjects:\n${result || "None"}`);
}

export async function projectRename(p: { from: string; to: string }): Promise<ToolResult> {
  const filesOutput = await execObsidian(["files", `folder=${THOUGHTS_DIR}/${p.from}`]);
  if (!filesOutput) return success(`Project "${p.from}" is empty or does not exist.`);

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
  return success(`Renamed project "${p.from}" to "${p.to}" (${files.length} file(s) moved).`);
}

// --- Handler map ---

export const handlers: Record<string, (p: any) => Promise<ToolResult>> = {
  create: thoughtCreate,
  list: thoughtList,
  clear: thoughtClear,
  project_set: projectSet,
  project_list: projectList,
  project_rename: projectRename,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "thought",
    `Manage thoughts and projects.

Actions:
- create: Create a thought with frontmatter (name, content required; type, tags optional)
- list: List thoughts in a project (project optional, defaults to active)
- clear: Delete all thoughts in a project (project optional)
- project_set: Set active project (name required)
- project_list: List all projects (no params)
- project_rename: Rename a project (from, to required)`,
    {
      action: z
        .enum(["create", "list", "clear", "project_set", "project_list", "project_rename"])
        .describe("Action to perform"),
      name: z.string().optional().describe("Thought filename or project name"),
      content: z.string().optional().describe("Markdown content of the thought"),
      type: z.string().optional().describe("Type of thought (e.g. research, design)"),
      tags: z.array(z.string()).optional().describe("Tags for the thought"),
      project: z.string().optional().describe("Project name (defaults to active project)"),
      from: z.string().optional().describe("Current project name (for rename)"),
      to: z.string().optional().describe("New project name (for rename)"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(`thought.${params.action} failed: ${(e as Error).message}`);
      }
    }
  );
}
