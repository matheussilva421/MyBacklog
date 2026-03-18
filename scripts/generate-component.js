#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const componentName = process.argv[2];

if (!componentName) {
  console.error("Usage: npm run generate:component <ComponentName>");
  process.exit(1);
}

if (!/^[A-Z][a-zA-Z0-9]*$/.test(componentName)) {
  console.error("Component name must be in PascalCase (e.g., GameCard, PlayerStats)");
  process.exit(1);
}

const kebabCase = componentName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
const componentDir = join(projectRoot, "src", "components");
const componentPath = join(componentDir, `${componentName}.tsx`);
const testPath = join(componentDir, `${componentName}.test.tsx`);

const componentContent = `import { cx } from "../backlog/shared";

export interface ${componentName}Props {
  className?: string;
}

export function ${componentName}({ className }: ${componentName}Props) {
  return (
    <div className={cx("${kebabCase}", className)}>
      {/* Component content */}
    </div>
  );
}
`;

const testContent = `import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ${componentName} } from "./${componentName}";

describe("${componentName}", () => {
  it("renders correctly", () => {
    render(<${componentName} />);
    expect(true).toBe(true);
  });
});
`;

for (const [path, content, description] of [
  [componentPath, componentContent, "component"],
  [testPath, testContent, "test"],
]) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content, "utf-8");
  console.log(`Created ${description}: ${relative(projectRoot, path)}`);
}

console.log(`\n${componentName} generated successfully.`);
console.log("Next steps:");
console.log(`  1. Edit src/components/${componentName}.tsx`);
console.log(`  2. Expand src/components/${componentName}.test.tsx`);
console.log("  3. Export from src/components/index.ts if you use barrel exports");
