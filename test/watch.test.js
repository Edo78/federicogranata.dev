const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");

// Resolve the watcher used by Eleventy, rather than a separately installed copy.
const chokidar = require(require.resolve("chokidar", {
  paths: [path.dirname(require.resolve("@11ty/eleventy"))],
}));

test("Eleventy's watcher detects content edits through glob patterns", { timeout: 10000 }, async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "test-11-watch-"));
  const file = path.join(directory, "post.md");
  fs.writeFileSync(file, "Original content");
  const watcher = chokidar.watch(path.join(directory, "**/*.md"), { ignoreInitial: true });
  t.after(async () => {
    await watcher.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  await once(watcher, "ready");
  let timer;
  try {
    const changed = Promise.race([
      once(watcher, "change"),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Content edits did not trigger the glob watcher")), 3000);
      }),
    ]);
    fs.writeFileSync(file, "Content saved from the CMS");
    const [changedFile] = await changed;
    assert.equal(path.resolve(changedFile), file);
  } finally {
    clearTimeout(timer);
  }
});
