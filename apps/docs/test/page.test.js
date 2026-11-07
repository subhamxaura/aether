const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const appDir = path.resolve(__dirname, "..");
const layoutPath = path.join(appDir, "app", "layout.tsx");
const pagePath = path.join(appDir, "app", "page.tsx");

test("Docs app layout: layout.tsx exists, is non-empty, and exports RootLayout with metadata", (t) => {
  assert.ok(fs.existsSync(layoutPath), "layout.tsx must exist");
  const stat = fs.statSync(layoutPath);
  assert.ok(stat.size > 0, "layout.tsx must be non-empty");

  const content = fs.readFileSync(layoutPath, "utf8");

  // Verify metadata export
  assert.match(content, /export\s+const\s+metadata\s*=/, "layout.tsx must export metadata object");
  assert.match(content, /title:\s*["']AETHER Documentation["']/, "metadata title must be 'AETHER Documentation'");
  assert.match(content, /description:\s*["'][^"']+["']/, "metadata description must be defined");

  // Verify RootLayout component export
  assert.match(content, /export\s+default\s+function\s+RootLayout/, "layout.tsx must export default function RootLayout");
  assert.match(content, /children:\s*React\.ReactNode/, "RootLayout must accept children prop");
  assert.match(content, /<html\s+lang=["']en["']>/, "RootLayout must render <html> with lang='en'");
  assert.match(content, /<body/, "RootLayout must render <body> tag");
});

test("Docs app page: page.tsx exists, is non-empty, and renders documentation portal structure", (t) => {
  assert.ok(fs.existsSync(pagePath), "page.tsx must exist");
  const stat = fs.statSync(pagePath);
  assert.ok(stat.size > 0, "page.tsx must be non-empty");

  const content = fs.readFileSync(pagePath, "utf8");

  // Verify DocsPage component export
  assert.match(content, /export\s+default\s+function\s+DocsPage/, "page.tsx must export default function DocsPage");

  // Verify main portal heading & description
  assert.match(content, /AETHER Documentation Portal/, "page.tsx must contain portal heading");
  assert.match(content, /Aether Sovereign Agent Operating System/, "page.tsx must mention sovereign agent OS");

  // Verify architecture & spec section links
  assert.match(content, /href=["']\/docs\/architecture["']/, "page.tsx must link to /docs/architecture");
  assert.match(content, /System Architecture & 4-Plane Topology/, "page.tsx must display System Architecture section");

  assert.match(content, /href=["']\/docs\/api-specification["']/, "page.tsx must link to /docs/api-specification");
  assert.match(content, /API Specification & gRPC Contracts/, "page.tsx must display API Specification section");

  assert.match(content, /href=["']\/docs\/data-models["']/, "page.tsx must link to /docs/data-models");
  assert.match(content, /PostgreSQL 16 Schema & Vector DDL/, "page.tsx must display Data Models section");
});
