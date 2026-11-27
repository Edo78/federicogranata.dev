const { test } = require("node:test");
const assert = require("node:assert/strict");
const settings = require("../src/_data/settings.json");
const { isSafeUrl, validateSettings, validatePost } = require("../src/_data/helpers/validate.js");

test("project settings are valid", () => {
  assert.doesNotThrow(() => validateSettings(settings));
});

test("unsafe URL schemes are rejected", () => {
  assert.equal(isSafeUrl("javascript:alert(1)"), false);
  assert.equal(isSafeUrl("//evil.example"), false);
  assert.equal(isSafeUrl("/about-me/"), true);
  assert.equal(isSafeUrl("https://example.com"), true);
});

test("pagination must be positive", () => {
  const invalid = structuredClone(settings);
  invalid.site.postsPerPage = 0;
  assert.throws(() => validateSettings(invalid), /postsPerPage/);
});

test("topic URLs cannot be empty or collide within a category", () => {
  const duplicate = structuredClone(settings);
  duplicate.categories[2].tags.push({ name: "societa" });
  assert.throws(() => validateSettings(duplicate), /duplicate topic slug/);
  const empty = structuredClone(settings);
  empty.categories[0].tags.push({ name: "!!!" });
  assert.throws(() => validateSettings(empty), /invalid or duplicate topic slug/);
  const shared = structuredClone(settings);
  shared.categories[0].tags.push({ name: "società" });
  assert.doesNotThrow(() => validateSettings(shared));
});

test("site timezone must be a valid IANA identifier", () => {
  const invalid = structuredClone(settings);
  invalid.site.timezone = "Mars/Olympus";
  assert.throws(() => validateSettings(invalid), /timezone/);
});

test("post category and chronology are validated", () => {
  const { categorySlugs, categoryTopics, formatValues } = validateSettings(settings);
  assert.throws(() => validatePost({
    title: "Post",
    description: "Description",
    category: "unknown",
    format: "nota",
    published: true,
    pinned: false,
    status: "evergreen",
    date: new Date("2026-01-02")
  }, categorySlugs, formatValues, categoryTopics), /unknown post category/);
  assert.throws(() => validatePost({
    title: "Post",
    description: "Description",
    category: "tecnologia",
    format: "nota",
    published: true,
    pinned: false,
    status: "evergreen",
    date: new Date("2026-01-02"),
    updated: new Date("2026-01-01")
  }, categorySlugs, formatValues, categoryTopics), /updated earlier/);
});

test("post format, status and category topics are validated", () => {
  const { categorySlugs, categoryTopics, formatValues } = validateSettings(settings);
  const basePost = {
    title: "Post",
    description: "Description",
    category: "tecnologia",
    format: "nota",
    tags: ["post", "obsidian"],
    published: true,
    pinned: false,
    status: "evergreen",
    date: new Date("2026-01-02")
  };

  assert.doesNotThrow(() => validatePost(basePost, categorySlugs, formatValues, categoryTopics));
  assert.doesNotThrow(() => validatePost({ ...basePost, status: "current" }, categorySlugs, formatValues, categoryTopics));
  assert.doesNotThrow(() => validatePost({ ...basePost, attachments: [{ file: "/files/story.pdf", label: "PDF" }, { file: "/files/story.epub" }], attachment: "/files/legacy.pdf" }, categorySlugs, formatValues, categoryTopics));
  assert.throws(() => validatePost({ ...basePost, attachments: "story.pdf" }, categorySlugs, formatValues, categoryTopics), /attachments must be an array/);
  assert.throws(() => validatePost({ ...basePost, attachments: [{ file: "javascript:alert(1)" }] }, categorySlugs, formatValues, categoryTopics), /attachment URL/);
  assert.throws(() => validatePost({ ...basePost, attachments: [{ file: "/files/story.pdf", label: 42 }] }, categorySlugs, formatValues, categoryTopics), /attachment label/);
  assert.throws(
    () => validatePost({ ...basePost, format: "unknown" }, categorySlugs, formatValues, categoryTopics),
    /unknown format/
  );
  assert.throws(
    () => validatePost({ ...basePost, tags: ["post", "scrittura"] }, categorySlugs, formatValues, categoryTopics),
    /outside category/
  );
  assert.throws(
    () => validatePost({ ...basePost, tags: "obsidian" }, categorySlugs, formatValues, categoryTopics),
    /tags must be an array/
  );
  assert.throws(
    () => validatePost({ ...basePost, tags: ["post", "obsidian", "koreader", "domotica", "javascript"] }, categorySlugs, formatValues, categoryTopics),
    /more than 3 topics/
  );
  assert.throws(
    () => validatePost({ ...basePost, tags: ["post", "obsidian", "obsidian"] }, categorySlugs, formatValues, categoryTopics),
    /duplicate topics/
  );
  assert.throws(
    () => validatePost({ ...basePost, tags: ["obsidian"] }, categorySlugs, formatValues, categoryTopics),
    /reserved 'post' tag exactly once/
  );
  assert.throws(
    () => validatePost({ ...basePost, tags: ["post", "post", "obsidian"] }, categorySlugs, formatValues, categoryTopics),
    /reserved 'post' tag exactly once/
  );
});
