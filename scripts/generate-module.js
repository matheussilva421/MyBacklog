#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const moduleName = process.argv[2];

if (!moduleName) {
  console.error("Usage: npm run generate:module <moduleName>");
  process.exit(1);
}

if (!/^[a-z][a-zA-Z0-9-]*$/.test(moduleName)) {
  console.error("Module name must be in camelCase or kebab-case (e.g., gameDetails, player-stats)");
  process.exit(1);
}

const pascalCase = moduleName.replace(/(^|-)([a-z])/g, (_match, _sep, char) => char.toUpperCase());
const moduleDir = join(projectRoot, "src", "modules", moduleName);
const structure = [
  ["components", `${pascalCase}Screen.tsx`, `import { LayoutTemplate } from "lucide-react";
import { Panel, SectionHeader } from "../../../components/cyberpunk-ui";

export interface ${pascalCase}ScreenProps {}

export function ${pascalCase}Screen({}: ${pascalCase}ScreenProps) {
  return (
    <Panel className="${moduleName}-screen">
      <SectionHeader icon={LayoutTemplate} title="${pascalCase}" description="Describe this module here." />
    </Panel>
  );
}
`],
  ["hooks", `use${pascalCase}.ts`, `import { useState } from "react";

export function use${pascalCase}() {
  const [loading, setLoading] = useState(false);

  return {
    loading,
    setLoading,
  };
}
`],
  ["utils", "index.ts", `export function create${pascalCase}Placeholder() {
  return null;
}
`],
  ["types", "index.ts", `export interface ${pascalCase}State {}
`],
  ["", "index.ts", `export { ${pascalCase}Screen } from "./components/${pascalCase}Screen";
export { use${pascalCase} } from "./hooks/use${pascalCase}";
export type * from "./types";
`],
];

for (const [directory, filename, content] of structure) {
  const targetDir = directory ? join(moduleDir, directory) : moduleDir;
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
    console.log(`Created directory: ${relative(projectRoot, targetDir)}`);
  }
  const targetPath = join(targetDir, filename);
  writeFileSync(targetPath, content, "utf-8");
  console.log(`Created file: ${relative(projectRoot, targetPath)}`);
}

console.log(`\nModule "${moduleName}" generated successfully.`);
console.log("Next steps:");
console.log(`  1. Edit src/modules/${moduleName}/components/${pascalCase}Screen.tsx`);
console.log(`  2. Define src/modules/${moduleName}/types/index.ts`);
console.log(`  3. Expand the hook and utilities for the new module`);
