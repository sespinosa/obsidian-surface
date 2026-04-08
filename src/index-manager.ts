import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { execObsidian } from "./cli.js";
import { THOUGHTS_DIR } from "./types.js";

export interface IndexEntry {
  path: string;
  project: string;
  created: string;
  type?: string;
  tags?: string[];
  summary?: string;
  cwd?: string;
}

interface Index {
  version: 1;
  updated: string;
  entries: IndexEntry[];
}

let cachedVaultPath: string | null = null;

/** Resolve the vault's absolute filesystem path from `obsidian vault` output (TSV) */
async function resolveVaultPath(): Promise<string> {
  if (cachedVaultPath) return cachedVaultPath;
  const output = await execObsidian(["vault"]);
  // Output is TSV lines like "path\t/Users/name/vault"
  for (const line of output.split("\n")) {
    const [key, ...rest] = line.split("\t");
    if (key?.trim().toLowerCase() === "path") {
      cachedVaultPath = rest.join("\t").trim();
      return cachedVaultPath;
    }
  }
  throw new Error("Could not resolve vault path from `obsidian vault` output");
}

/** Get the absolute filesystem path to the index file */
async function indexFilePath(): Promise<string> {
  const vaultPath = await resolveVaultPath();
  return join(vaultPath, THOUGHTS_DIR, "_index.json");
}

/** Read the index from disk, returning an empty index if it doesn't exist */
async function readIndex(): Promise<Index> {
  try {
    const filePath = await indexFilePath();
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as Index;
  } catch {
    return { version: 1, updated: new Date().toISOString(), entries: [] };
  }
}

/** Write the index to disk */
async function writeIndex(index: Index): Promise<void> {
  const filePath = await indexFilePath();
  await mkdir(join(filePath, ".."), { recursive: true });
  index.updated = new Date().toISOString();
  await writeFile(filePath, JSON.stringify(index, null, 2), "utf-8");
}

/** Append or replace an entry in the index (deduplicates by path) */
export async function appendEntry(entry: IndexEntry): Promise<void> {
  const index = await readIndex();
  const existingIdx = index.entries.findIndex((e) => e.path === entry.path);
  if (existingIdx >= 0) {
    index.entries[existingIdx] = entry;
  } else {
    index.entries.push(entry);
  }
  await writeIndex(index);
}

/** Remove entries matching a project from the index */
export async function removeEntriesByProject(project: string): Promise<number> {
  const index = await readIndex();
  const before = index.entries.length;
  index.entries = index.entries.filter((e) => e.project !== project);
  const removed = before - index.entries.length;
  if (removed > 0) await writeIndex(index);
  return removed;
}

/** Remove a single entry by path */
export async function removeEntry(path: string): Promise<void> {
  const index = await readIndex();
  index.entries = index.entries.filter((e) => e.path !== path);
  await writeIndex(index);
}

/** Query the index with optional filters */
export async function queryIndex(filters?: {
  project?: string;
  type?: string;
  tags?: string[];
  since?: string;
  query?: string;
}): Promise<IndexEntry[]> {
  const index = await readIndex();
  let results = index.entries;

  if (filters?.project) {
    results = results.filter((e) => e.project === filters.project);
  }
  if (filters?.type) {
    results = results.filter((e) => e.type === filters.type);
  }
  if (filters?.tags && filters.tags.length > 0) {
    results = results.filter((e) =>
      filters.tags!.some((t) => e.tags?.includes(t))
    );
  }
  if (filters?.since) {
    results = results.filter((e) => e.created >= filters.since!);
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.summary?.toLowerCase().includes(q) ||
        e.project.toLowerCase().includes(q)
    );
  }

  return results;
}

/** Get the N most recent entries across all projects */
export async function recentEntries(limit: number = 10): Promise<IndexEntry[]> {
  const index = await readIndex();
  return index.entries
    .sort((a, b) => b.created.localeCompare(a.created))
    .slice(0, limit);
}

/** Parse frontmatter from markdown content */
function parseFrontmatter(content: string): Record<string, string | string[]> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, string | string[]> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Handle array values like [tag1, tag2]
    if (value.startsWith("[") && value.endsWith("]")) {
      fm[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      fm[key] = value;
    }
  }
  return fm;
}

/** Rebuild the entire index by scanning all thought files */
export async function reindex(): Promise<number> {
  const vaultPath = await resolveVaultPath();
  const thoughtsRoot = join(vaultPath, THOUGHTS_DIR);
  const entries: IndexEntry[] = [];

  let projects: string[];
  try {
    projects = await readdir(thoughtsRoot);
  } catch {
    // Thoughts directory doesn't exist yet
    const index: Index = { version: 1, updated: new Date().toISOString(), entries: [] };
    await writeIndex(index);
    return 0;
  }

  for (const project of projects) {
    // Skip files/dirs starting with _
    if (project.startsWith("_")) continue;

    const projectDir = join(thoughtsRoot, project);
    const projectStat = await stat(projectDir).catch(() => null);
    if (!projectStat?.isDirectory()) continue;

    const files = await readdir(projectDir);
    for (const file of files) {
      // Skip files starting with _
      if (basename(file).startsWith("_")) continue;
      if (!file.endsWith(".md")) continue;

      const filePath = join(projectDir, file);
      const content = await readFile(filePath, "utf-8");
      const fm = parseFrontmatter(content);

      entries.push({
        path: `${THOUGHTS_DIR}/${project}/${file}`,
        project: (fm.project as string) || project,
        created: (fm.created as string) || new Date().toISOString(),
        type: fm.type as string | undefined,
        tags: Array.isArray(fm.tags) ? fm.tags : undefined,
        summary: fm.summary as string | undefined,
        cwd: fm.cwd as string | undefined,
      });
    }
  }

  const index: Index = { version: 1, updated: new Date().toISOString(), entries };
  await writeIndex(index);
  return entries.length;
}
