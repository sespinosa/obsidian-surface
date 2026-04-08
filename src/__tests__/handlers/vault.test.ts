import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../cli.js", () => ({
  execObsidian: vi.fn(),
}));

describe("vault handlers", () => {
  let execObsidian: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const cli = await import("../../cli.js");
    execObsidian = vi.mocked(cli.execObsidian);
  });

  describe("vaultCommands", () => {
    it("calls execObsidian with commands arg", async () => {
      execObsidian.mockResolvedValue("cmd1: Description\ncmd2: Another");
      const { vaultCommands } = await import("../../tools/vault.js");

      const result = await vaultCommands({});

      expect(execObsidian).toHaveBeenCalledWith(["commands"]);
      expect(result.content[0].text).toBe("cmd1: Description\ncmd2: Another");
    });

    it("filters results when filter is provided", async () => {
      execObsidian.mockResolvedValue(
        "editor:focus-left: Focus left\nworkspace:close: Close\neditor:focus-right: Focus right",
      );
      const { vaultCommands } = await import("../../tools/vault.js");

      const result = await vaultCommands({ filter: "focus" });

      expect(result.content[0].text).toBe(
        "editor:focus-left: Focus left\neditor:focus-right: Focus right",
      );
    });

    it("returns all commands when no filter", async () => {
      execObsidian.mockResolvedValue("cmd1\ncmd2\ncmd3");
      const { vaultCommands } = await import("../../tools/vault.js");

      const result = await vaultCommands({});

      expect(result.content[0].text).toBe("cmd1\ncmd2\ncmd3");
    });

    it("returns no-match message when filter has no results", async () => {
      execObsidian.mockResolvedValue("cmd1: Description\ncmd2: Another");
      const { vaultCommands } = await import("../../tools/vault.js");

      const result = await vaultCommands({ filter: "nonexistent" });

      expect(result.content[0].text).toBe(
        'No commands matching "nonexistent".',
      );
    });

    it("returns 'No commands found' when result is empty", async () => {
      execObsidian.mockResolvedValue("");
      const { vaultCommands } = await import("../../tools/vault.js");

      const result = await vaultCommands({});

      expect(result.content[0].text).toBe("No commands found.");
    });
  });

  describe("vaultInfo", () => {
    it("returns vault info from execObsidian", async () => {
      execObsidian.mockResolvedValue("name\tMy Vault\npath\t/home/user/vault");
      const { vaultInfo } = await import("../../tools/vault.js");

      const result = await vaultInfo();

      expect(execObsidian).toHaveBeenCalledWith(["vault"]);
      expect(result.content[0].text).toBe(
        "name\tMy Vault\npath\t/home/user/vault",
      );
    });
  });
});
