import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "property_get",
    "Read a frontmatter property from a note",
    {
      path: z.string().describe("Path to the note"),
      key: z.string().describe("Property key to read"),
    },
    async ({ path, key }) => {
      try {
        const result = await execObsidian(["property:read", `path=${path}`, `key=${key}`]);
        return success(result || `Property "${key}" not found.`);
      } catch (e) {
        return error(`Failed to read property: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "property_set",
    "Set a frontmatter property on a note",
    {
      path: z.string().describe("Path to the note"),
      key: z.string().describe("Property key"),
      value: z.string().describe("Property value"),
    },
    async ({ path, key, value }) => {
      try {
        const result = await execObsidian(["property:set", `path=${path}`, `key=${key}`, `value=${value}`]);
        return success(result || `Set property "${key}" = "${value}" on ${path}`);
      } catch (e) {
        return error(`Failed to set property: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "property_remove",
    "Remove a frontmatter property from a note",
    {
      path: z.string().describe("Path to the note"),
      key: z.string().describe("Property key to remove"),
    },
    async ({ path, key }) => {
      try {
        const result = await execObsidian(["property:remove", `path=${path}`, `key=${key}`]);
        return success(result || `Removed property "${key}" from ${path}`);
      } catch (e) {
        return error(`Failed to remove property: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "properties_list",
    "List all frontmatter properties on a note",
    {
      path: z.string().describe("Path to the note"),
    },
    async ({ path }) => {
      try {
        const result = await execObsidian(["properties", `path=${path}`]);
        return success(result || "No properties found.");
      } catch (e) {
        return error(`Failed to list properties: ${(e as Error).message}`);
      }
    }
  );
}
