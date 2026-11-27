const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function readEnvironment(values = {}) {
  const env = { ...process.env };
  for (const key of ["ELEVENTY_ENV", "CMS_GITHUB_REPO", "CMS_GITHUB_BRANCH", "CMS_GITHUB_AUTH_SCOPE", "CMS_OAUTH_SITE_DOMAIN", "DEPLOY_PRIME_URL", "BRANCH", "CONTEXT", "URL"]) {
    delete env[key];
  }
  return JSON.parse(execFileSync(process.execPath, [
    "-e", 'console.log(JSON.stringify(require("./src/_data/env.js")))',
  ], { cwd: path.join(__dirname, ".."), env: { ...env, ...values }, encoding: "utf8" }));
}

test("production builds default to the main content branch", () => {
  const env = readEnvironment();
  assert.equal(env.CMS_GITHUB_REPO, "Edo78/federicogranata.dev");
  assert.equal(env.CMS_GITHUB_BRANCH, "main");
  assert.equal(env.CMS_GITHUB_AUTH_SCOPE, "public_repo");
  assert.equal(env.CMS_OAUTH_SITE_DOMAIN, "federico-granata.netlify.app");
});

test("production CMS uses main and the primary domain rather than a deploy alias", () => {
  const env = readEnvironment({ BRANCH: "main", CONTEXT: "production", URL: "https://blog.federicogranata.dev", DEPLOY_PRIME_URL: "https://main--federico-granata.netlify.app" });
  assert.equal(env.CMS_GITHUB_BRANCH, "main");
  assert.equal(env.CMS_SITE_URL, "https://blog.federicogranata.dev");
});

test("Netlify branch deploys use their branch while OAuth identifies the parent site", () => {
  const env = readEnvironment({ BRANCH: "cms-oauth", DEPLOY_PRIME_URL: "https://cms-oauth--federico-granata.netlify.app" });
  assert.equal(env.CMS_GITHUB_BRANCH, "cms-oauth");
  assert.equal(env.CMS_SITE_URL, "https://cms-oauth--federico-granata.netlify.app");
  assert.equal(env.CMS_OAUTH_SITE_DOMAIN, "federico-granata.netlify.app");
});

test("explicit CMS branch settings take precedence over the deploy branch", () => {
  const env = readEnvironment({ BRANCH: "another-branch", CMS_GITHUB_BRANCH: "cms-oauth", ELEVENTY_ENV: "development" });
  assert.equal(env.CMS_GITHUB_BRANCH, "cms-oauth");
  assert.equal(env.ELEVENTY_ENV, "development");
});

test("media Deploy Previews keep writes and navigation on the test branch", () => {
  const env = readEnvironment({
    CONTEXT: "deploy-preview",
    BRANCH: "pull/6/head",
    CMS_GITHUB_BRANCH: "cms-media-attachments",
    URL: "https://blog.federicogranata.dev",
    DEPLOY_PRIME_URL: "https://deploy-preview-6--federico-granata.netlify.app",
  });
  assert.equal(env.CMS_GITHUB_BRANCH, "cms-media-attachments");
  assert.equal(env.CMS_SITE_URL, "https://deploy-preview-6--federico-granata.netlify.app");
  assert.equal(env.CMS_OAUTH_SITE_DOMAIN, "federico-granata.netlify.app");
});
