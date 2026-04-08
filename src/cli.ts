import { execFile } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { platform } from "node:os";
import { join } from "node:path";

let cachedCliPath: string | null = null;
let cachedIsWSL: boolean | null = null;

/** Detect if running under WSL */
async function detectWSL(): Promise<boolean> {
  if (cachedIsWSL !== null) return cachedIsWSL;
  try {
    const version = await readFile("/proc/version", "utf-8");
    cachedIsWSL = /microsoft|wsl/i.test(version);
  } catch {
    cachedIsWSL = false;
  }
  return cachedIsWSL;
}

/** Check if a file exists and is executable */
async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Try to find `obsidian` on PATH using `which` */
async function findOnPath(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile("which", ["obsidian"], (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

/** Find Obsidian binary by scanning user directories */
async function findObsidianInUserDirs(base: string, suffix: string): Promise<string | null> {
  try {
    const users = await readdir(base);
    for (const user of users) {
      const candidate = join(base, user, suffix);
      if (await isExecutable(candidate)) return candidate;
    }
  } catch {
    // base dir doesn't exist or not readable
  }
  return null;
}

/** Resolve the Obsidian CLI binary path */
async function resolveCliPath(): Promise<string> {
  if (cachedCliPath) return cachedCliPath;

  // 1. Explicit env var
  const envPath = process.env.OBSIDIAN_CLI_PATH;
  if (envPath) {
    cachedCliPath = envPath;
    return cachedCliPath;
  }

  // 2. On PATH
  const onPath = await findOnPath();
  if (onPath) {
    cachedCliPath = onPath;
    return cachedCliPath;
  }

  // 3. Platform-specific auto-detect
  const isWsl = await detectWSL();
  const os = platform();

  if (isWsl || os === "win32") {
    const base = isWsl ? "/mnt/c/Users" : "C:\\Users";
    const suffix = isWsl
      ? "AppData/Local/Programs/Obsidian/Obsidian.com"
      : "AppData\\Local\\Programs\\Obsidian\\Obsidian.com";
    const found = await findObsidianInUserDirs(base, suffix);
    if (found) {
      cachedCliPath = found;
      return cachedCliPath;
    }
  }

  if (os === "darwin") {
    const macPath = "/Applications/Obsidian.app/Contents/MacOS/Obsidian";
    if (await isExecutable(macPath)) {
      cachedCliPath = macPath;
      return cachedCliPath;
    }
  }

  if (os === "linux" && !isWsl) {
    // Common Linux install paths
    const linuxPaths = [
      "/snap/obsidian/current/obsidian",
      "/var/lib/flatpak/exports/bin/md.obsidian.Obsidian",
    ];
    for (const p of linuxPaths) {
      if (await isExecutable(p)) {
        cachedCliPath = p;
        return cachedCliPath;
      }
    }
  }

  throw new Error(
    "Could not find Obsidian CLI. Set OBSIDIAN_CLI_PATH environment variable or ensure 'obsidian' is on your PATH."
  );
}

/** Execute an Obsidian CLI command and return stdout */
export async function execObsidian(args: string[]): Promise<string> {
  const cliPath = await resolveCliPath();
  const isWsl = await detectWSL();

  return new Promise((resolve, reject) => {
    execFile(
      cliPath,
      args,
      {
        // WSL needs cwd set to /mnt/c to avoid UNC path issues
        cwd: isWsl ? "/mnt/c" : undefined,
        timeout: 30_000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr?.trim() || err.message));
        } else {
          resolve(stdout.trim());
        }
      }
    );
  });
}
