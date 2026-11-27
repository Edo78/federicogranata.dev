const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const OUTPUT_DIR = path.join(__dirname, "..", "_site");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filePath) : [filePath];
  });
}

test("generated social images resolve to published files", () => {
  const htmlFiles = walk(OUTPUT_DIR).filter((file) => file.endsWith(".html"));
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const imageMatches = html.matchAll(/<(?:meta property="og:image" content|meta name="twitter:image" content)="[^"]+\/([^/"]+)"/g);
    for (const match of imageMatches) {
      assert.ok(fs.existsSync(path.join(OUTPUT_DIR, "img", match[1])), `${file} references missing image ${match[1]}`);
    }
  }
});

test("legacy KOReader and home automation articles retain their restored covers", () => {
  for (const slug of ["appunti-elettronici", "domotica-e-come-implementarla"]) {
    const html = fs.readFileSync(path.join(OUTPUT_DIR, "tecnologia", slug, "index.html"), "utf8");
    assert.match(html, /class="post-cover\b/);
    assert.ok(html.includes(`/img/${slug}.jpg`), `${slug} must retain its original social cover`);
  }
});

test("responsive and structured-data images resolve to published files", () => {
  const htmlFiles = walk(OUTPUT_DIR).filter((file) => file.endsWith(".html"));
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const images = [];
    for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
      images.push(...match[1].split(",").map(candidate => candidate.trim().split(/\s+/)[0]));
    }
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const schema = JSON.parse(match[1]);
      if (schema.image) images.push(schema.image);
    }
    for (const image of images) {
      const url = new URL(image, canonical || "https://example.com/");
      assert.ok(fs.existsSync(path.join(OUTPUT_DIR, decodeURIComponent(url.pathname))), `${file} references missing image ${image}`);
    }
  }
});

test("production admin output contains no inline scripts or local backend", () => {
  const adminHtml = fs.readFileSync(path.join(OUTPUT_DIR, "admin", "index.html"), "utf8");
  const adminConfig = fs.readFileSync(path.join(OUTPUT_DIR, "admin", "config.yml"), "utf8");
  assert.doesNotMatch(adminHtml, /<script(?:\s[^>]*)?>\s*[^<\s]/i);
  assert.match(adminHtml, /src="\/js\/admin\.js"/);
  assert.doesNotMatch(adminConfig, /local_backend:\s*true/);
});

test("published CMS uses GitHub OAuth and the intended content branch", () => {
  const env = require("../src/_data/env.js");
  const config = fs.readFileSync(path.join(OUTPUT_DIR, "admin", "config.yml"), "utf8");
  assert.match(config, /name: github/);
  assert.doesNotMatch(config, /name: git-gateway/);
  assert.ok(config.includes(`repo: ${JSON.stringify(env.CMS_GITHUB_REPO)}`));
  assert.ok(config.includes(`branch: ${JSON.stringify(env.CMS_GITHUB_BRANCH)}`));
  assert.ok(config.includes(`site_domain: ${JSON.stringify(env.CMS_OAUTH_SITE_DOMAIN)}`));
  assert.match(config, /base_url: https:\/\/api\.netlify\.com/);
  assert.doesNotMatch(config, /client_secret|access_token/i);
});

test("generated CMS options remain valid quoted YAML scalars", () => {
  const adminConfig = fs.readFileSync(path.join(OUTPUT_DIR, "admin", "config.yml"), "utf8");
  assert.doesNotMatch(adminConfig, /&quot;/);
  assert.match(adminConfig, /\{ label: "Tecnologia", value: "tecnologia" \}/);
  assert.match(adminConfig, /\{ label: "Opinione", value: "opinione" \}/);
});

test("attachment media folders are rooted under assets instead of editorial collections", () => {
  const config = fs.readFileSync(path.join(OUTPUT_DIR, "admin", "config.yml"), "utf8");
  assert.match(config, /^media_folder: "src\/assets\/images"/m);
  assert.match(config, /widget: "file"\s+media_folder: "\/src\/assets\/files"\s+public_folder: "\/files"/);
  const fieldFolders = [...config.matchAll(/^[ \t]+media_folder: "([^"]+)"/gm)].map(match => match[1]);
  assert.ok(fieldFolders.length > 0);
  assert.ok(fieldFolders.every(folder => folder.startsWith("/src/assets/")));
});

test("public pages have one h1 and the favicon is emitted", () => {
  const htmlFiles = walk(OUTPUT_DIR).filter((file) => file.endsWith(".html") && !file.includes(`${path.sep}admin${path.sep}`));
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const h1Count = (html.match(/<h1\b/g) || []).length;
    assert.equal(h1Count, 1, `${file} should contain exactly one h1`);
  }
  assert.ok(fs.existsSync(path.join(OUTPUT_DIR, "favicon.svg")));
});

test("internal page assets and links resolve", () => {
  const htmlFiles = walk(OUTPUT_DIR).filter((file) => file.endsWith(".html"));
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const references = html.matchAll(/\b(?:href|src)="(\/[^"?#]*)/g);
    for (const match of references) {
      const relativePath = match[1].endsWith("/") ? `${match[1]}index.html` : match[1];
      assert.ok(fs.existsSync(path.join(OUTPUT_DIR, relativePath)), `${file} references missing ${match[1]}`);
    }
  }
});

test("sitemap follows all generated public HTML pages", () => {
  const sitemap = fs.readFileSync(path.join(OUTPUT_DIR, "sitemap.xml"), "utf8");
  const htmlFiles = walk(OUTPUT_DIR).filter((file) =>
    file.endsWith(".html") &&
    !file.endsWith(`${path.sep}404.html`) &&
    !file.includes(`${path.sep}admin${path.sep}`)
  );

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(canonical, `${file} is missing a canonical URL`);
    assert.match(sitemap, new RegExp(`<loc>${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc>`));
  }
});

test("mobile navigation is usable without script enhancement", () => {
  const home = fs.readFileSync(path.join(OUTPUT_DIR, "index.html"), "utf8");
  assert.match(home, /<details class="mobile-nav/);
  assert.match(home, /<summary class="menu-button">/);
  assert.doesNotMatch(home, /id="menu-toggle"/);
});

test("desktop and mobile navigation follow the configured category order", () => {
  const settings = require("../src/_data/settings.json");
  const home = fs.readFileSync(path.join(OUTPUT_DIR, "index.html"), "utf8");
  const expected = ["/", ...settings.categories.map(category => `/${category.slug}/`), "/about-me/"];
  for (const selector of [/id="nav-menu"[^>]*>([\s\S]*?)<\/ul>/, /class="mobile-menu[^"]*"[^>]*>([\s\S]*?)<\/ul>/]) {
    const menu = home.match(selector)?.[1];
    assert.ok(menu, "navigation menu must be rendered");
    assert.deepEqual([...menu.matchAll(/href="([^"]+)"/g)].map(match => match[1]), expected);
  }
  const config = fs.readFileSync(path.join(OUTPUT_DIR, "admin", "config.yml"), "utf8");
  assert.doesNotMatch(config, /name:\s*"navigation"/);
});

test("build script applies production mode to CSS and Eleventy", () => {
  const packageJson = require("../package.json");
  const assignments = packageJson.scripts.build.match(/ELEVENTY_ENV=production/g) || [];
  assert.equal(assignments.length, 2);
});

test("admin CSP is scoped after the strict public policy", () => {
  const netlifyConfig = fs.readFileSync(path.join(__dirname, "..", "netlify.toml"), "utf8");
  const publicRule = netlifyConfig.indexOf('for = "/*"');
  const adminRule = netlifyConfig.indexOf('for = "/admin/*"');
  assert.ok(publicRule >= 0 && adminRule > publicRule);

  const publicPolicy = netlifyConfig.slice(publicRule, adminRule);
  const adminPolicy = netlifyConfig.slice(adminRule);
  assert.doesNotMatch(publicPolicy, /unsafe-eval/);
  assert.match(adminPolicy, /unsafe-eval/);
});

test("editor CSP permits media reads before upload without relaxing public pages", () => {
  const config = fs.readFileSync(path.join(__dirname, "..", "netlify.toml"), "utf8");
  const publicRule = config.indexOf('for = "/*"');
  const adminRule = config.indexOf('for = "/admin/*"');
  const publicPolicy = config.slice(publicRule, adminRule).match(/Content-Security-Policy = "([^"]+)"/)[1];
  const adminPolicy = config.slice(adminRule).match(/Content-Security-Policy = "([^"]+)"/)[1];
  const directives = Object.fromEntries(adminPolicy.split(";").filter(value => value.trim()).map(value => {
    const [name, ...sources] = value.trim().split(/\s+/);
    return [name, sources];
  }));
  assert.ok(directives["connect-src"].includes("blob:"), "Decap fetches temporary assets before persisting them");
  assert.ok(directives["connect-src"].includes("https://raw.githubusercontent.com"));
  assert.ok(directives["img-src"].includes("https://raw.githubusercontent.com"));
  assert.ok(directives["img-src"].includes("https://avatars.githubusercontent.com"));
  assert.doesNotMatch(publicPolicy, /blob:|raw\.githubusercontent\.com|avatars\.githubusercontent\.com/);
});

test("published articles are reachable exactly once in their respective archives", () => {
  const htmlFiles = walk(OUTPUT_DIR)
    .filter(file => file.endsWith(".html"));

  const pages = new Map(htmlFiles.map(file => [
    path.relative(OUTPUT_DIR, file).split(path.sep).join("/"),
    fs.readFileSync(file, "utf8"),
  ]));

  function internalLinks(html) {
    return [...html.matchAll(/\bhref="(\/[^"]*)"/g)]
      .map(match => match[1])
      .filter(href => !href.startsWith("//"))
      .map(href => decodeURIComponent(
        new URL(href, "https://example.com").pathname
      ));
  }

  function archivePages(archiveUrl) {
    const prefix = archiveUrl.slice(1);

    assert.ok(
      pages.has(`${prefix}index.html`),
      `Missing archive ${archiveUrl}`
    );

    return [...pages.entries()]
      .filter(([file]) =>
        file === `${prefix}index.html` ||
        (
          file.startsWith(prefix) &&
          /^page\/\d+\/index\.html$/.test(
            file.slice(prefix.length)
          )
        )
      );
  }

  const settings = require("../src/_data/settings.json");
  const categories = new Set(
    settings.categories.map(category => category.slug)
  );

  for (const [file, html] of pages) {
    const parts = file.split("/");

    if (
      parts.length !== 3 ||
      !categories.has(parts[0]) ||
      parts[2] !== "index.html"
    ) continue;

    const header = html.match(
      /<header class="article-header">([\s\S]*?)<\/header>/
    )?.[1];

    assert.ok(header, `${file}: article header is missing`);

    const postUrl = `/${file.replace(/index\.html$/, "")}`;
    const category = file.split("/")[0];

    const topics = internalLinks(header)
      .filter(url => url.startsWith(`/${category}/tag/`));

    const archives = new Set([
      "/",
      `/${category}/`,
      ...topics,
    ]);

    for (const archive of archives) {
      const occurrences = archivePages(archive)
        .flatMap(([, content]) => internalLinks(content))
        .filter(url => url === postUrl)
        .length;

      assert.equal(
        occurrences,
        1,
        `${postUrl} must appear exactly once in ${archive}`
      );
    }
  }
});
