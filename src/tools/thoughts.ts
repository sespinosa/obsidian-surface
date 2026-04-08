import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { getProject, setProject } from "../state.js";
import { THOUGHTS_DIR, success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "thought_create",
    "Create a thought (note with frontmatter) in the active project and open it in Obsidian",
    {
      name: z.string().describe("Filename for the thought (without .md extension)"),
      content: z.string().describe("Markdown content of the thought"),
      type: z.string().optional().describe("Type of thought (e.g. research, design, comparison)"),
      tags: z.array(z.string()).optional().describe("Tags for the thought"),
    },
    async ({ name, content, type, tags }) => {
      try {
        const project = getProject();
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

        return success(result || `Created thought: ${path}`);
      } catch (e) {
        return error(`Failed to create thought: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "thought_list",
    "List all thoughts in a project",
    {
      project: z.string().optional().describe("Project name (defaults to active project)"),
    },
    async ({ project }) => {
      try {
        const proj = project || getProject();
        const result = await execObsidian(["files", `folder=${THOUGHTS_DIR}/${proj}`]);
        return success(result || "No thoughts found.");
      } catch (e) {
        return error(`Failed to list thoughts: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "thought_clear",
    "Delete all thoughts in a project",
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
    "List all thought projects",
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
}
