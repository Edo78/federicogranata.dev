const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");

test("pinned posts are rendered in their archives", async (t) => {
  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "blog-pinned-test-")
  );

  t.after(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  fs.cpSync(
    path.join(ROOT, "src"),
    path.join(workspace, "src"),
    { recursive: true }
  );

  for (const file of [
    "eleventy.config.js",
    "package.json",
    ".eleventyignore",
  ]) {
    fs.copyFileSync(
      path.join(ROOT, file),
      path.join(workspace, file)
    );
  }

  fs.symlinkSync(
    path.join(ROOT, "node_modules"),
    path.join(workspace, "node_modules"),
    "dir"
  );

  const postsDir = path.join(workspace, "src/content/posts");

  // Keep directory data, but isolate the test from real posts.
  for (const file of fs.readdirSync(postsDir)) {
    if (file.endsWith(".md")) {
      fs.unlinkSync(path.join(postsDir, file));
    }
  }

  fs.writeFileSync(
    path.join(postsDir, "pinned-with-cover.md"),
    `---
title: Pinned with cover
description: Featured post with a cover
category: opinioni
format: nota
tags:
  - blog
published: true
pinned: true
status: current
date: 2025-01-02T12:00:00Z
cover: /img/lalba-di-una-nuova-era.jpg
---
Featured content with a cover.
`
  );

  fs.writeFileSync(
    path.join(postsDir, "pinned-without-cover.md"),
    `---
title: Pinned without cover
description: Featured post without a cover
category: tecnologia
format: nota
tags:
  - javascript
published: true
pinned: true
status: current
date: 2025-01-01T12:00:00Z
---
Featured content without a cover.
`
  );

  execFileSync(
    path.join(ROOT, "node_modules/.bin/eleventy"),
    [],
    {
      cwd: workspace,
      env: {
        ...process.env,
        ELEVENTY_ENV: "production",
      },
      stdio: "pipe",
    }
  );

  const cases = [
    ["index.html", "/opinioni/pinned-with-cover/"],
    ["opinioni/index.html", "/opinioni/pinned-with-cover/"],
    ["opinioni/tag/blog/index.html", "/opinioni/pinned-with-cover/"],
    ["tecnologia/index.html", "/tecnologia/pinned-without-cover/"],
    ["tecnologia/tag/javascript/index.html", "/tecnologia/pinned-without-cover/"],
  ];

  for (const [file, url] of cases) {
    await t.test(file, () => {
      const html = fs.readFileSync(
        path.join(workspace, "_site", file),
        "utf8"
      );

      const featured = html.match(
        /<article\b[^>]*class="[^"]*\bfeature-panel\b[^"]*"[^>]*>[\s\S]*?<\/article>/
      )?.[0];

      assert.ok(featured, `${file}: featured panel is missing`);

      const link = `href="${url}"`;

      assert.ok(
        featured.includes(link),
        `${file}: featured post link is missing`
      );

      assert.equal(
        html.split(link).length - 1,
        1,
        `${file}: featured post must appear exactly once`
      );
    });
  }
});
