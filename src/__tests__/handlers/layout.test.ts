import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../cli.js", () => ({
  execObsidian: vi.fn(),
}));

describe("layout handlers", () => {
  let execObsidian: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const cli = await import("../../cli.js");
    execObsidian = vi.mocked(cli.execObsidian);
  });

  describe("layoutClose", () => {
    it("maps 'current' target to workspace:close", async () => {
      execObsidian.mockResolvedValue("");
      const { layoutClose } = await import("../../tools/layout.js");

      await layoutClose({ target: "current" });

      expect(execObsidian).toHaveBeenCalledWith([
        "command",
        "id=workspace:close",
      ]);
    });

    it("maps 'others' target to workspace:close-others", async () => {
      execObsidian.mockResolvedValue("");
      const { layoutClose } = await import("../../tools/layout.js");

      await layoutClose({ target: "others" });

      expect(execObsidian).toHaveBeenCalledWith([
        "command",
        "id=workspace:close-others",
      ]);
    });

    it("maps 'all' target to workspace:close-all", async () => {
      execObsidian.mockResolvedValue("");
      const { layoutClose } = await import("../../tools/layout.js");

      await layoutClose({ target: "all" });

      expect(execObsidian).toHaveBeenCalledWith([
        "command",
        "id=workspace:close-all",
      ]);
    });

    it("defaults to 'current' when no target provided", async () => {
      execObsidian.mockResolvedValue("");
      const { layoutClose } = await import("../../tools/layout.js");

      const result = await layoutClose({});

      expect(execObsidian).toHaveBeenCalledWith([
        "command",
        "id=workspace:close",
      ]);
      expect(result.content[0].text).toBe("Closed current tab(s).");
    });

    it("returns success message with target name", async () => {
      execObsidian.mockResolvedValue("");
      const { layoutClose } = await import("../../tools/layout.js");

      const result = await layoutClose({ target: "all" });

      expect(result.content[0].text).toBe("Closed all tab(s).");
    });
  });

  describe("layoutSplit", () => {
    it("sends correct split command", async () => {
      execObsidian.mockResolvedValue("");
      const { layoutSplit } = await import("../../tools/layout.js");

      await layoutSplit({ direction: "vertical" });

      expect(execObsidian).toHaveBeenCalledWith([
        "command",
        "id=workspace:split-vertical",
      ]);
    });
  });

  describe("layoutOpen", () => {
    it("sends open command with path", async () => {
      execObsidian.mockResolvedValue("Opened");
      const { layoutOpen } = await import("../../tools/layout.js");

      const result = await layoutOpen({ path: "notes/test.md" });

      expect(execObsidian).toHaveBeenCalledWith(["open", "path=notes/test.md"]);
      expect(result.content[0].text).toBe("Opened");
    });
  });
});
