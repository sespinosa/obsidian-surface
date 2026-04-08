import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock node:child_process
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

// Mock node:fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  access: vi.fn(),
  readdir: vi.fn(),
}));

// Mock node:os
vi.mock("node:os", () => ({
  platform: vi.fn(() => "linux"),
}));

describe("cli", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    delete process.env.OBSIDIAN_CLI_PATH;
  });

  describe("detectWSL (via execObsidian behavior)", () => {
    it("detects WSL when /proc/version contains microsoft", async () => {
      const { readFile } = await import("node:fs/promises");
      const { execFile } = await import("node:child_process");

      vi.mocked(readFile).mockResolvedValue(
        "Linux version 5.15.0 (Microsoft@Microsoft.com)" as any,
      );

      process.env.OBSIDIAN_CLI_PATH = "/usr/bin/obsidian";

      vi.mocked(execFile).mockImplementation(
        (_cmd: any, _args: any, _opts: any, cb: any) => {
          cb(null, "  output  ", "");
          return undefined as any;
        },
      );

      const { execObsidian } = await import("../cli.js");
      await execObsidian(["vault"]);

      expect(execFile).toHaveBeenCalledWith(
        "/usr/bin/obsidian",
        ["vault"],
        expect.objectContaining({ cwd: "/mnt/c" }),
        expect.any(Function),
      );
    });

    it("does not set cwd when not WSL", async () => {
      const { readFile } = await import("node:fs/promises");
      const { execFile } = await import("node:child_process");

      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));

      process.env.OBSIDIAN_CLI_PATH = "/usr/bin/obsidian";

      vi.mocked(execFile).mockImplementation(
        (_cmd: any, _args: any, _opts: any, cb: any) => {
          cb(null, "output", "");
          return undefined as any;
        },
      );

      const { execObsidian } = await import("../cli.js");
      await execObsidian(["vault"]);

      expect(execFile).toHaveBeenCalledWith(
        "/usr/bin/obsidian",
        ["vault"],
        expect.objectContaining({ cwd: undefined }),
        expect.any(Function),
      );
    });

    it("treats non-microsoft /proc/version as not WSL", async () => {
      const { readFile } = await import("node:fs/promises");
      const { execFile } = await import("node:child_process");

      vi.mocked(readFile).mockResolvedValue(
        "Linux version 5.15.0-generic (builder@ubuntu)" as any,
      );

      process.env.OBSIDIAN_CLI_PATH = "/usr/bin/obsidian";

      vi.mocked(execFile).mockImplementation(
        (_cmd: any, _args: any, _opts: any, cb: any) => {
          cb(null, "output", "");
          return undefined as any;
        },
      );

      const { execObsidian } = await import("../cli.js");
      await execObsidian(["vault"]);

      expect(execFile).toHaveBeenCalledWith(
        "/usr/bin/obsidian",
        ["vault"],
        expect.objectContaining({ cwd: undefined }),
        expect.any(Function),
      );
    });
  });

  describe("resolveCliPath (via execObsidian)", () => {
    it("uses OBSIDIAN_CLI_PATH env var when set", async () => {
      const { readFile } = await import("node:fs/promises");
      const { execFile } = await import("node:child_process");

      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));
      process.env.OBSIDIAN_CLI_PATH = "/custom/path/obsidian";

      vi.mocked(execFile).mockImplementation(
        (_cmd: any, _args: any, _opts: any, cb: any) => {
          cb(null, "result", "");
          return undefined as any;
        },
      );

      const { execObsidian } = await import("../cli.js");
      await execObsidian(["test"]);

      expect(execFile).toHaveBeenCalledWith(
        "/custom/path/obsidian",
        ["test"],
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("falls back to PATH lookup via which", async () => {
      const { readFile } = await import("node:fs/promises");
      const { execFile } = await import("node:child_process");

      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));

      let callCount = 0;
      vi.mocked(execFile).mockImplementation(
        (cmd: any, args: any, optsOrCb: any, cb?: any) => {
          callCount++;
          if (callCount === 1) {
            // which obsidian call
            const callback = cb || optsOrCb;
            callback(null, "/usr/local/bin/obsidian\n", "");
          } else {
            // actual obsidian call
            const callback = cb || optsOrCb;
            callback(null, "result", "");
          }
          return undefined as any;
        },
      );

      const { execObsidian } = await import("../cli.js");
      await execObsidian(["test"]);

      // Second call should use the path found by which
      expect(execFile).toHaveBeenCalledWith(
        "/usr/local/bin/obsidian",
        ["test"],
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  describe("execObsidian", () => {
    it("passes correct arguments to execFile", async () => {
      const { readFile } = await import("node:fs/promises");
      const { execFile } = await import("node:child_process");

      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));
      process.env.OBSIDIAN_CLI_PATH = "/usr/bin/obsidian";

      vi.mocked(execFile).mockImplementation(
        (_cmd: any, _args: any, _opts: any, cb: any) => {
          cb(null, "  some output  ", "");
          return undefined as any;
        },
      );

      const { execObsidian } = await import("../cli.js");
      const result = await execObsidian(["create", "path=test.md"]);

      expect(result).toBe("some output");
      expect(execFile).toHaveBeenCalledWith(
        "/usr/bin/obsidian",
        ["create", "path=test.md"],
        expect.objectContaining({
          timeout: 30_000,
          maxBuffer: 10 * 1024 * 1024,
        }),
        expect.any(Function),
      );
    });

    it("trims stdout on success", async () => {
      const { readFile } = await import("node:fs/promises");
      const { execFile } = await import("node:child_process");

      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));
      process.env.OBSIDIAN_CLI_PATH = "/usr/bin/obsidian";

      vi.mocked(execFile).mockImplementation(
        (_cmd: any, _args: any, _opts: any, cb: any) => {
          cb(null, "\n  result with whitespace  \n", "");
          return undefined as any;
        },
      );

      const { execObsidian } = await import("../cli.js");
      const result = await execObsidian(["test"]);
      expect(result).toBe("result with whitespace");
    });

    it("rejects with stderr message on error", async () => {
      const { readFile } = await import("node:fs/promises");
      const { execFile } = await import("node:child_process");

      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));
      process.env.OBSIDIAN_CLI_PATH = "/usr/bin/obsidian";

      vi.mocked(execFile).mockImplementation(
        (_cmd: any, _args: any, _opts: any, cb: any) => {
          cb(new Error("process failed"), "", "Something went wrong");
          return undefined as any;
        },
      );

      const { execObsidian } = await import("../cli.js");
      await expect(execObsidian(["test"])).rejects.toThrow(
        "Something went wrong",
      );
    });

    it("falls back to err.message when stderr is empty", async () => {
      const { readFile } = await import("node:fs/promises");
      const { execFile } = await import("node:child_process");

      vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));
      process.env.OBSIDIAN_CLI_PATH = "/usr/bin/obsidian";

      vi.mocked(execFile).mockImplementation(
        (_cmd: any, _args: any, _opts: any, cb: any) => {
          cb(new Error("process failed"), "", "");
          return undefined as any;
        },
      );

      const { execObsidian } = await import("../cli.js");
      await expect(execObsidian(["test"])).rejects.toThrow("process failed");
    });
  });
});
