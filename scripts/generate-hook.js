#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const hookName = process.argv[2];

if (!hookName) {
  console.error("Usage: npm run generate:hook <hookName>");
  process.exit(1);
}

if (!/^[a-z][a-zA-Z]*$/.test(hookName) || !hookName.startsWith("use")) {
  console.error('Hook name must be in camelCase and start with "use" (e.g., useGames, useLibrary)');
  process.exit(1);
}

const hooksDir = join(projectRoot, "src", "hooks");
const hookPath = join(hooksDir, `${hookName}.ts`);
const testPath = join(hooksDir, `${hookName}.test.ts`);
const stateName = hookName.replace(/^use/, "") || "Hook";

const hookContent = `import { useState } from "react";

export interface ${stateName}State {
  // Define state shape here
}

export interface ${stateName}Actions {
  // Define actions here
}

export function ${hookName}() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    loading,
    error,
    setLoading,
    setError,
  };
}
`;

const testContent = `import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ${hookName} } from "./${hookName}";

describe("${hookName}", () => {
  it("initializes with loading false", () => {
    const { result } = renderHook(() => ${hookName}());
    expect(result.current.loading).toBe(false);
  });
});
`;

for (const [path, content, description] of [
  [hookPath, hookContent, "hook"],
  [testPath, testContent, "test"],
]) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content, "utf-8");
  console.log(`Created ${description}: ${relative(projectRoot, path)}`);
}

console.log(`\n${hookName} generated successfully.`);
console.log("Next steps:");
console.log(`  1. Edit src/hooks/${hookName}.ts`);
console.log(`  2. Expand src/hooks/${hookName}.test.ts`);
