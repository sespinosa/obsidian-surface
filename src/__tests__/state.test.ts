import { beforeEach, describe, expect, it, vi } from "vitest";

describe("state", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.OBSIDIAN_DEFAULT_PROJECT;
  });

  it("defaults to cwd basename when no env var is set", async () => {
    const { getProject } = await import("../state.js");
    const expected = process.cwd().split("/").pop()!;
    expect(getProject()).toBe(expected);
  });

  it("uses OBSIDIAN_DEFAULT_PROJECT env var when set", async () => {
    process.env.OBSIDIAN_DEFAULT_PROJECT = "my-custom-project";
    const { getProject } = await import("../state.js");
    expect(getProject()).toBe("my-custom-project");
  });

  it("setProject / getProject round-trip", async () => {
    const { getProject, setProject } = await import("../state.js");
    setProject("new-project");
    expect(getProject()).toBe("new-project");
  });

  it("setProject overrides previous value", async () => {
    const { getProject, setProject } = await import("../state.js");
    setProject("first");
    setProject("second");
    expect(getProject()).toBe("second");
  });
});
