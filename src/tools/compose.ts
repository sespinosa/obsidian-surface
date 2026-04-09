import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { error, type HandlerFn, success } from "../types.js";
import { handlers as dailyHandlers } from "./daily.js";
import { handlers as devHandlers } from "./dev.js";
import { handlers as layoutHandlers } from "./layout.js";
import { handlers as noteHandlers } from "./note.js";
import { handlers as propertyHandlers } from "./property.js";
import { handlers as searchHandlers } from "./search.js";
import { handlers as surfaceHandlers } from "./surface.js";
import { handlers as tagHandlers } from "./tag.js";
import { handlers as taskHandlers } from "./task.js";
import { handlers as templateHandlers } from "./template.js";
import { handlers as vaultHandlers } from "./vault.js";

const toolMap: Record<string, Record<string, HandlerFn>> = {
  surface: surfaceHandlers,
  note: noteHandlers,
  layout: layoutHandlers,
  vault: vaultHandlers,
  search: searchHandlers,
  property: propertyHandlers,
  daily: dailyHandlers,
  tag: tagHandlers,
  task: taskHandlers,
  template: templateHandlers,
  dev: devHandlers,
};

export function register(server: McpServer): void {
  server.tool(
    "compose",
    `Execute multiple operations sequentially as a single atomic action.
Eliminates intermediate focus shifts and reduces round-trips.

Each step specifies a tool, action, and optional params.
Execution stops on first error. Returns results for all executed steps.

Example:
  steps: [
    { tool: "surface", action: "create", params: { name: "demo", content: "Hello", summary: "Demo" } },
    { tool: "layout", action: "open", params: { path: "my/note.md" } },
    { tool: "layout", action: "split", params: { direction: "vertical" } }
  ]`,
    {
      steps: z
        .array(
          z.object({
            tool: z
              .enum([
                "surface",
                "note",
                "layout",
                "vault",
                "search",
                "property",
                "daily",
                "tag",
                "task",
                "template",
                "dev",
              ])
              .describe("Tool name"),
            action: z.string().describe("Action within the tool"),
            params: z
              .record(z.unknown())
              .optional()
              .describe("Parameters for the action"),
          }),
        )
        .describe("Ordered list of steps to execute"),
    },
    async ({ steps }) => {
      const results: Array<{ step: string; ok: boolean; text: string }> = [];

      for (const step of steps) {
        const handlers = toolMap[step.tool];
        const handler =
          handlers && Object.hasOwn(handlers, step.action)
            ? handlers[step.action]
            : undefined;

        if (!handler) {
          results.push({
            step: `${step.tool}.${step.action}`,
            ok: false,
            text: `Unknown action "${step.action}" for tool "${step.tool}"`,
          });
          return error(JSON.stringify(results, null, 2));
        }

        try {
          const result = await handler(step.params || {});
          const text = result.content.map((c) => c.text).join("\n");
          const ok = !result.isError;
          results.push({ step: `${step.tool}.${step.action}`, ok, text });

          if (!ok) {
            return error(JSON.stringify(results, null, 2));
          }
        } catch (e) {
          results.push({
            step: `${step.tool}.${step.action}`,
            ok: false,
            text: (e as Error).message,
          });
          return error(JSON.stringify(results, null, 2));
        }
      }

      return success(JSON.stringify(results, null, 2));
    },
  );
}
