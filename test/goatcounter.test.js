const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const manifest = require("../vendor/goatcounter.json");

test("GoatCounter script matches its declared SHA-384 hash", () => {
  const script = fs.readFileSync(
    path.join(__dirname, "../src/public/js/goatcounter.js")
  );

  const hash = createHash("sha384")
    .update(script)
    .digest("base64");

  assert.equal(hash, manifest.sha384);
});

test("GoatCounter CSP permissions are restricted to the counting endpoint", () => {
  const config = fs.readFileSync(
    path.join(__dirname, "../netlify.toml"),
    "utf8"
  );

  const publicPolicy = config
    .match(/Content-Security-Policy = "([^"]+)"/)[1];

  const directives = Object.fromEntries(
    publicPolicy.split(";")
      .filter(value => value.trim())
      .map(value => {
        const [name, ...sources] = value.trim().split(/\s+/);
        return [name, sources];
      })
  );

  const endpoint = "https://stats.federicogranata.dev/count";

  assert.deepEqual(directives["script-src"], [
    "'self'"
  ]);

  assert.deepEqual(directives["connect-src"], [
    "'self'",
    endpoint
  ]);

  assert.deepEqual(directives["img-src"], [
    "'self'",
    "data:",
    endpoint
  ]);
});
