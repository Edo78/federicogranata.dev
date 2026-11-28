const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { runInNewContext } = require("node:vm");

const manifest = require("../vendor/goatcounter.json");
const script = fs.readFileSync(
  path.join(__dirname, "../src/public/js/goatcounter.js")
);

function loadCounter(getStorage, hash = "") {
  const hits = [];
  const alerts = [];
  const location = new URL("https://example.com/" + hash);
  const context = {
    location,
    parent: { location },
    screen: { width: 800, height: 600 },
    document: { body: {}, querySelector: () => null },
    navigator: { sendBeacon: url => hits.push(url) },
    goatcounter: { endpoint: "https://example.com/count" },
    console: { warn() {} },
    alert: message => alerts.push(message),
    get localStorage() { return getStorage(); }
  };
  context.window = context;
  runInNewContext(script.toString("utf8"), context);
  return { hits, alerts, count: context.goatcounter.count };
}

test("GoatCounter skips automatic and manual hits when storage reads throw", () => {
  const deny = () => { throw new DOMException("Storage denied", "SecurityError"); };
  for (const getStorage of [deny, () => ({ getItem: deny })]) {
    for (const hash of ["", "#toggle-goatcounter"]) {
      const { hits, alerts, count } = loadCounter(getStorage, hash);
      count();
      assert.deepEqual(hits, []);
      assert.deepEqual(alerts, []);
    }
  }
});

test("GoatCounter skips hits when the opt-out toggle cannot write to storage", () => {
  const { hits, alerts, count } = loadCounter(() => ({
    getItem: () => null,
    setItem() { throw new DOMException("Storage denied", "SecurityError"); }
  }), "#toggle-goatcounter");
  count();
  assert.deepEqual(hits, []);
  assert.deepEqual(alerts, []);
});

test("GoatCounter counts with working storage and respects the opt-out toggle", () => {
  const values = new Map();
  const storage = () => ({
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  });
  assert.equal(loadCounter(storage).hits.length, 1);

  const disabled = loadCounter(storage, "#toggle-goatcounter");
  assert.match(disabled.alerts[0], /DISABLED/);
  assert.equal(disabled.hits.length, 0);
  assert.equal(loadCounter(storage).hits.length, 0);

  const enabled = loadCounter(storage, "#toggle-goatcounter");
  assert.match(enabled.alerts[0], /ENABLED/);
  assert.equal(enabled.hits.length, 1);
});

test("GoatCounter script matches its declared SHA-384 hash", () => {
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
