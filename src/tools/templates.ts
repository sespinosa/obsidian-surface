import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "templates_list",
    "List available templates in the vault",
    {},
    async () => {
      try {
        const result = await execObsidian(["templates"]);
        return success(result || "No templates found.");
      } catch (e) {
        return error(`Failed to list templates: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "template_insert",
    "Insert a template into the active file",
    {
      name: z.string().describe("Template name"),
    },
    async ({ name }) => {
      try {
        const result = await execObsidian(["template:insert", `name=${name}`]);
        return success(result || `Inserted template: ${name}`);
      } catch (e) {
        return error(`Failed to insert template: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "template_read",
    "Read the content of a template",
    {
      name: z.string().describe("Template name"),
    },
    async ({ name }) => {
      try {
        const result = await execObsidian(["template:read", `name=${name}`]);
        return success(result);
      } catch (e) {
        return error(`Failed to read template: ${(e as Error).message}`);
      }
    }
  );
}
