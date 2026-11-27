const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");

test("articles publish multiple downloads and preserve legacy attachments", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "blog-attachments-test-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  fs.cpSync(path.join(ROOT, "src"), path.join(workspace, "src"), { recursive: true });
  for (const file of ["eleventy.config.js", "package.json", ".eleventyignore"]) {
    fs.copyFileSync(path.join(ROOT, file), path.join(workspace, file));
  }
  fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(workspace, "node_modules"), "dir");
  const posts = path.join(workspace, "src/content/posts");
  for (const file of fs.readdirSync(posts)) {
    if (file.endsWith(".md")) fs.unlinkSync(path.join(posts, file));
  }
  const files = path.join(workspace, "src/assets/files");
  fs.mkdirSync(files, { recursive: true });
  for (const file of ["story.pdf", "story.epub", "legacy.pdf"]) {
    fs.writeFileSync(path.join(files, file), `Original ${file} content`);
  }
  const post = (slug, fields, published = true) => fs.writeFileSync(path.join(posts, `${slug}.md`), `---
title: ${slug}
description: Attachment rendering fixture
category: narrativa
format: nota
tags: [scrittura]
published: ${published}
pinned: false
status: current
date: 2025-01-02T12:00:00Z
${fields}
---
Story content.
`);
  post("multiple-downloads", `attachments:
  - label: Scarica PDF
    file: /files/story.pdf
  - label: Scarica EPUB
    file: /files/story.epub`);
  post("legacy-download", "attachment: /files/legacy.pdf");
  post("mixed-download", `attachment: /files/legacy.pdf
attachments:
  - label: Edizione PDF
    file: /files/legacy.pdf`);
  post("draft-download", "attachments: [{ file: /files/story.pdf }]", false);

  execFileSync(path.join(ROOT, "node_modules/.bin/eleventy"), [], {
    cwd: workspace,
    env: { ...process.env, ELEVENTY_ENV: "production" },
    stdio: "pipe",
  });
  const output = path.join(workspace, "_site");
  const html = fs.readFileSync(path.join(output, "narrativa/multiple-downloads/index.html"), "utf8");
  assert.match(html, /href="\/files\/story\.pdf" download[^>]*>Scarica PDF<\/a>/);
  assert.match(html, /href="\/files\/story\.epub" download[^>]*>Scarica EPUB<\/a>/);
  const legacy = fs.readFileSync(path.join(output, "narrativa/legacy-download/index.html"), "utf8");
  assert.match(legacy, /href="\/files\/legacy\.pdf" download[^>]*>Scarica legacy\.pdf<\/a>/);
  const mixed = fs.readFileSync(path.join(output, "narrativa/mixed-download/index.html"), "utf8");
  assert.equal((mixed.match(/href="\/files\/legacy\.pdf"/g) || []).length, 1);
  assert.ok(mixed.includes("Edizione PDF"));
  for (const file of ["story.pdf", "story.epub", "legacy.pdf"]) {
    assert.equal(fs.readFileSync(path.join(output, "files", file), "utf8"), `Original ${file} content`);
  }
  assert.equal(fs.existsSync(path.join(output, "narrativa/draft-download/index.html")), false);
});
