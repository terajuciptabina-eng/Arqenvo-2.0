import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, basename } from "node:path";

const root = resolve(process.cwd(), "node_modules");
const outputDir = resolve(process.cwd(), "benchmark-output");
mkdirSync(outputDir, { recursive: true });
const packages = [];
const visited = new Set();

function walkModules(directory) {
  let entries;
  try { entries = readdirSync(directory, { withFileTypes: true }); }
  catch { return; }
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const entryPath = join(directory, entry.name);
    if (entry.name.startsWith("@")) {
      walkModules(entryPath);
      continue;
    }
    const packageJsonPath = join(entryPath, "package.json");
    try {
      if (statSync(entryPath).isDirectory()) {
        const metadata = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        const licenseFiles = [];
        for (const name of readdirSync(entryPath)) {
          if (/^(license|licence|copying|notice)(\.|$)/i.test(name)) licenseFiles.push(name);
        }
        const identity = metadata.name + "@" + metadata.version + ":" + entryPath;
        if (!visited.has(identity)) {
          visited.add(identity);
          packages.push({
            name: metadata.name ?? basename(entryPath),
            version: metadata.version ?? null,
            license: metadata.license ?? null,
            repository: metadata.repository ?? null,
            licenseFiles
          });
        }
      }
    } catch {}
    walkModules(entryPath);
  }
}
walkModules(root);
packages.sort((a, b) => (a.name + a.version).localeCompare(b.name + b.version));
const inventory = {
  generatedAt: new Date().toISOString(),
  candidateDirectory: process.cwd(),
  node: process.versions.node,
  packageCount: packages.length,
  packagesWithMissingLicenseMetadata: packages.filter((item) => !item.license).map((item) => item.name + "@" + item.version),
  packages
};
writeFileSync(resolve(outputDir, "license-inventory.json"), JSON.stringify(inventory, null, 2));
console.log(JSON.stringify({
  generatedAt: inventory.generatedAt,
  packageCount: inventory.packageCount,
  packagesWithMissingLicenseMetadata: inventory.packagesWithMissingLicenseMetadata
}, null, 2));
