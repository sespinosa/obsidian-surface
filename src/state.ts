import { basename } from "node:path";

let activeProject: string = process.env.OBSIDIAN_DEFAULT_PROJECT || basename(process.cwd());

export function getProject(): string {
  return activeProject;
}

export function setProject(name: string): void {
  activeProject = name;
}
