const { test } = require("node:test");
const assert = require("node:assert/strict");
const configure = require("../eleventy.config.js");
const settings = require("../src/_data/settings.json");

function post(slug, category, date, { pinned = false, published = true, topics = [] } = {}) {
  const publicationDate = new Date(date);
  return {
    inputPath: `./src/content/posts/${slug}.md`,
    date: publicationDate,
    data: {
      title: slug,
      description: `Description of ${slug}`,
      category,
      format: "nota",
      tags: ["post", ...topics],
      pinned,
      published,
      status: "evergreen",
      date: publicationDate,
    },
  };
}

function collectionsFor(posts, environment = "production") {
  const callbacks = {};
  configure({
    addCollection: (name, callback) => { callbacks[name] = callback; },
    addPlugin() {},
    addPassthroughCopy() {},
    addFilter() {},
    addShortcode() {},
    amendLibrary() {},
    addWatchTarget() {},
  });
  const previousEnvironment = process.env.ELEVENTY_ENV;
  process.env.ELEVENTY_ENV = environment;
  try {
    const api = { getFilteredByTag: () => [...posts] };
    return Object.fromEntries(Object.entries(callbacks).map(([name, callback]) => [name, callback(api)]));
  } finally {
    if (previousEnvironment === undefined) delete process.env.ELEVENTY_ENV;
    else process.env.ELEVENTY_ENV = previousEnvironment;
  }
}

test("home and categories feature their newest pinned post without losing older candidates", () => {
  const olderTech = post("older-tech", "tecnologia", "2026-01-01", { pinned: true });
  const newerTech = post("newer-tech", "tecnologia", "2026-01-03", { pinned: true });
  const story = post("story", "narrativa", "2026-01-04", { pinned: true });
  const opinion = post("opinion", "opinioni", "2026-01-02", { pinned: true });
  const latest = post("latest-unpinned", "tecnologia", "2026-01-05");
  const collections = collectionsFor([olderTech, latest, story, newerTech, opinion]);

  assert.equal(collections.homePages[0].pinnedPost, story);
  assert.deepEqual(collections.homePages[0].posts, [latest, newerTech, opinion, olderTech]);
  const technology = collections.categoryPages.find(page => page.category.slug === "tecnologia");
  assert.equal(technology.pinnedPost, newerTech);
  assert.deepEqual(technology.posts, [latest, olderTech]);
  assert.equal(collections.categoryPages.find(page => page.category.slug === "narrativa").pinnedPost, story);
  assert.equal(collections.categoryPages.find(page => page.category.slug === "opinioni").pinnedPost, opinion);
});

test("production ignores pinned drafts while development can preview them", () => {
  const published = post("published", "tecnologia", "2026-01-01", { pinned: true });
  const draft = post("draft", "tecnologia", "2026-01-02", { pinned: true, published: false });
  const production = collectionsFor([draft, published]);
  assert.deepEqual(production.posts, [published]);
  assert.equal(production.homePages[0].pinnedPost, published);
  assert.equal(production.categoryPages.find(page => page.category.slug === "tecnologia").pinnedPost, published);
  assert.equal(collectionsFor([published, draft], "development").homePages[0].pinnedPost, draft);
});

test("pagination excludes only the featured winner and retains every other post exactly once", () => {
  const posts = Array.from({ length: settings.site.postsPerPage + 3 }, (_, index) =>
    post(`tech-${index}`, "tecnologia", new Date(Date.UTC(2026, 0, index + 1)), { pinned: true })
  );
  const collections = collectionsFor(posts);
  for (const pages of [collections.homePages, collections.categoryPages.filter(page => page.category.slug === "tecnologia")]) {
    assert.equal(pages.length, 2);
    assert.ok(pages.every(page => page.pinnedPost === posts.at(-1)));
    const archived = pages.flatMap(page => page.posts);
    assert.equal(archived.length, posts.length - 1);
    assert.equal(new Set(archived).size, archived.length);
    assert.ok(!archived.includes(posts.at(-1)));
    assert.ok(pages.every(page => page.totalPosts === posts.length));
  }
});

test("archives without pinned posts, including empty categories, have no featured post", () => {
  const ordinary = post("ordinary", "tecnologia", "2026-01-01");
  const collections = collectionsFor([ordinary]);
  assert.equal(collections.homePages[0].pinnedPost, null);
  assert.deepEqual(collections.homePages[0].posts, [ordinary]);
  assert.ok(collections.categoryPages.every(page => page.pinnedPost === null));
  assert.deepEqual(collections.categoryPages.find(page => page.category.slug === "narrativa").posts, []);
  assert.deepEqual(collectionsFor([]).homePages[0].posts, []);
});

test("topic archives select their own newest pinned post, independently of the category winner", () => {
  const older = post("older", "tecnologia", "2026-01-01", { pinned: true, topics: ["obsidian"] });
  const featured = post("featured", "tecnologia", "2026-01-03", { pinned: true, topics: ["obsidian", "koreader"] });
  const categoryWinner = post("category-winner", "tecnologia", "2026-01-04", { pinned: true, topics: ["javascript"] });
  const latest = post("latest", "tecnologia", "2026-01-05", { topics: ["obsidian"] });
  const draft = post("draft", "tecnologia", "2026-01-06", { pinned: true, published: false, topics: ["obsidian"] });
  const story = post("story", "narrativa", "2026-01-07", { pinned: true, topics: ["scrittura"] });
  const collections = collectionsFor([draft, categoryWinner, older, latest, featured, story]);
  const topic = collections.topicPages.find(page => page.topic.url === "/tecnologia/tag/obsidian/");
  assert.equal(topic.pinnedPost, featured);
  assert.deepEqual(topic.posts, [latest, older]);
  assert.equal(topic.totalPosts, 3);
  assert.equal(collections.categoryPages.find(page => page.category.slug === "tecnologia").pinnedPost, categoryWinner);
  assert.equal(collections.topicPages.find(page => page.topic.name === "koreader").pinnedPost, featured);
  assert.equal(collectionsFor([draft, older], "development").topicPages.find(page => page.topic.name === "obsidian").pinnedPost, draft);
});

test("topic archives paginate without duplicates and preserve empty configured topics", () => {
  const posts = Array.from({ length: settings.site.postsPerPage + 3 }, (_, index) =>
    post(`topic-${index}`, "tecnologia", new Date(Date.UTC(2026, 0, index + 1)), { pinned: true, topics: ["obsidian"] })
  );
  const collections = collectionsFor(posts);
  const pages = collections.topicPages.filter(page => page.topic.url === "/tecnologia/tag/obsidian/");
  assert.equal(pages.length, 2);
  assert.ok(pages.every(page => page.pinnedPost === posts.at(-1)));
  assert.deepEqual(pages.flatMap(page => page.posts), posts.slice(0, -1).reverse());
  const empty = collections.topicPages.find(page => page.topic.url === "/opinioni/tag/societa/");
  assert.equal(empty.topic.name, "società");
  assert.equal(empty.totalPages, 1);
  assert.equal(empty.totalPosts, 0);
  assert.equal(empty.pinnedPost, null);
  assert.deepEqual(empty.posts, []);
});
