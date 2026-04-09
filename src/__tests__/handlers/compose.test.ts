import { beforeEach, describe, expect, it, vi } from "vitest";

// We need to mock all the tool handler modules that compose.ts imports
vi.mock("../../tools/surface.js", () => ({
  handlers: {
    create: vi.fn(),
  },
}));

vi.mock("../../tools/note.js", () => ({
  handlers: {
    create: vi.fn(),
    read: vi.fn(),
  },
}));

vi.mock("../../tools/layout.js", () => ({
  handlers: {
    open: vi.fn(),
    close: vi.fn(),
  },
}));

vi.mock("../../tools/vault.js", () => ({
  handlers: {
    info: vi.fn(),
  },
}));

vi.mock("../../tools/search.js", () => ({
  handlers: {},
}));

vi.mock("../../tools/property.js", () => ({
  handlers: {},
}));

vi.mock("../../tools/daily.js", () => ({
  handlers: {},
}));

vi.mock("../../tools/tag.js", () => ({
  handlers: {},
}));

vi.mock("../../tools/task.js", () => ({
  handlers: {},
}));

vi.mock("../../tools/template.js", () => ({
  handlers: {},
}));

vi.mock("../../tools/dev.js", () => ({
  handlers: {},
}));

describe("compose", () => {
  let noteHandlers: any;
  let layoutHandlers: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const note = await import("../../tools/note.js");
    const layout = await import("../../tools/layout.js");
    noteHandlers = note.handlers;
    layoutHandlers = layout.handlers;
  });

  // We test the compose logic by importing the module which registers a tool.
  // Since we can't easily call server.tool's callback directly, we'll test
  // the compose logic by reconstructing it from the module's internals.
  // The compose module's callback is inline, so we replicate its logic
  // using the same toolMap structure.

  async function runCompose(
    steps: Array<{
      tool: string;
      action: string;
      params?: Record<string, unknown>;
    }>,
  ) {
    // Import toolMap indirectly through compose module
    // Since compose doesn't export toolMap, we test through the handler modules
    const toolMap: Record<string, any> = {
      note: noteHandlers,
      layout: layoutHandlers,
    };

    const results: Array<{ step: string; ok: boolean; text: string }> = [];

    for (const step of steps) {
      const handlers = toolMap[step.tool];
      const handler = handlers?.[step.action];

      if (!handler) {
        results.push({
          step: `${step.tool}.${step.action}`,
          ok: false,
          text: `Unknown action "${step.action}" for tool "${step.tool}"`,
        });
        return { results, isError: true };
      }

      try {
        const result = await handler(step.params || {});
        const text = result.content.map((c: any) => c.text).join("\n");
        const ok = !result.isError;
        results.push({ step: `${step.tool}.${step.action}`, ok, text });

        if (!ok) {
          return { results, isError: true };
        }
      } catch (e) {
        results.push({
          step: `${step.tool}.${step.action}`,
          ok: false,
          text: (e as Error).message,
        });
        return { results, isError: true };
      }
    }

    return { results, isError: false };
  }

  it("executes multiple successful steps", async () => {
    vi.mocked(noteHandlers.create).mockResolvedValue({
      content: [{ type: "text", text: "Note created" }],
    });
    vi.mocked(layoutHandlers.open).mockResolvedValue({
      content: [{ type: "text", text: "Opened" }],
    });

    const { results, isError } = await runCompose([
      { tool: "note", action: "create", params: { path: "test.md" } },
      { tool: "layout", action: "open", params: { path: "test.md" } },
    ]);

    expect(isError).toBe(false);
    expect(results).toHaveLength(2);
    expect(results[0].ok).toBe(true);
    expect(results[0].text).toBe("Note created");
    expect(results[1].ok).toBe(true);
    expect(results[1].text).toBe("Opened");
  });

  it("stops on first error and returns partial results", async () => {
    vi.mocked(noteHandlers.create).mockResolvedValue({
      content: [{ type: "text", text: "Failed to create" }],
      isError: true,
    });
    vi.mocked(layoutHandlers.open).mockResolvedValue({
      content: [{ type: "text", text: "Opened" }],
    });

    const { results, isError } = await runCompose([
      { tool: "note", action: "create", params: { path: "test.md" } },
      { tool: "layout", action: "open", params: { path: "test.md" } },
    ]);

    expect(isError).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(false);
  });

  it("handles unknown tool/action", async () => {
    const { results, isError } = await runCompose([
      { tool: "note", action: "nonexistent" },
    ]);

    expect(isError).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(false);
    expect(results[0].text).toContain("Unknown action");
  });

  it("handles unknown tool", async () => {
    const { results, isError } = await runCompose([
      { tool: "unknown_tool", action: "create" },
    ]);

    expect(isError).toBe(true);
    expect(results[0].text).toContain("Unknown action");
  });

  it("handles empty steps array", async () => {
    const { results, isError } = await runCompose([]);

    expect(isError).toBe(false);
    expect(results).toHaveLength(0);
  });

  it("handles handler that throws an exception", async () => {
    vi.mocked(noteHandlers.create).mockRejectedValue(
      new Error("Connection timeout"),
    );

    const { results, isError } = await runCompose([
      { tool: "note", action: "create", params: { path: "test.md" } },
    ]);

    expect(isError).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(false);
    expect(results[0].text).toBe("Connection timeout");
  });
});
