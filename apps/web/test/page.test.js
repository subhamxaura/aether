const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const appDir = path.resolve(__dirname, "..");
const layoutPath = path.join(appDir, "app", "layout.tsx");
const pagePath = path.join(appDir, "app", "page.tsx");

test("Web app layout: layout.tsx exists, is non-empty, and exports RootLayout with metadata", (t) => {
  assert.ok(fs.existsSync(layoutPath), "layout.tsx must exist");
  const stat = fs.statSync(layoutPath);
  assert.ok(stat.size > 0, "layout.tsx must be non-empty");

  const content = fs.readFileSync(layoutPath, "utf8");

  // Verify metadata export
  assert.match(content, /export\s+const\s+metadata\s*=/, "layout.tsx must export metadata object");
  assert.match(content, /title:\s*["']AETHER/, "metadata title must reference AETHER");
  assert.match(content, /description:\s*["'][^"']+["']/, "metadata description must be defined");

  // Verify RootLayout component export
  assert.match(content, /export\s+default\s+function\s+RootLayout/, "layout.tsx must export default function RootLayout");
  assert.match(content, /children:\s*React\.ReactNode/, "RootLayout must accept children prop");
  assert.match(content, /<html\s+lang=["']en["']>/, "RootLayout must render <html> with lang='en'");
  assert.match(content, /<body/, "RootLayout must render <body> tag");
});

test("Web app page: page.tsx exists, is non-empty, and renders hero, pillars, and launch CTAs", (t) => {
  assert.ok(fs.existsSync(pagePath), "page.tsx must exist");
  const stat = fs.statSync(pagePath);
  assert.ok(stat.size > 0, "page.tsx must be non-empty");

  const content = fs.readFileSync(pagePath, "utf8");

  // Verify HomePage component export
  assert.match(content, /export\s+default\s+function\s+HomePage/, "page.tsx must export default function HomePage");

  // Verify hero heading and tagline
  assert.match(content, /The Sovereign Agent/, "page.tsx must contain hero heading");
  assert.match(content, /Operating System/, "page.tsx must contain 'Operating System' subtitle");
  assert.match(content, /Open Source Deterministic Execution Fabric/, "page.tsx must mention deterministic execution fabric");

  // Verify CTAs
  assert.match(content, /Explore Documentation/, "page.tsx must have link to Explore Documentation");
  assert.match(content, /View on GitHub/, "page.tsx must have link to View on GitHub");
  assert.match(content, /https:\/\/github\.com\/aether-ai\/aether/, "page.tsx must link to official GitHub repository");

  // Verify 3 core architectural pillars
  assert.match(content, /Control Plane Kernel/, "page.tsx must highlight Control Plane Kernel pillar");
  assert.match(content, /Tri-Tier Memory Fabric/, "page.tsx must highlight Tri-Tier Memory Fabric pillar");
  assert.match(content, /Zero-Trust Sandboxes/, "page.tsx must highlight Zero-Trust Sandboxes pillar");
});
