let activeProject: string = process.env.OBSIDIAN_DEFAULT_PROJECT || "default";

export function getProject(): string {
  return activeProject;
}

export function setProject(name: string): void {
  activeProject = name;
}
