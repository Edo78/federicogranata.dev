const { URL } = require("node:url");
const { topicSlug } = require("./topics.js");

const ALLOWED_SCHEMAS = new Set([
  "BlogPosting", "HowTo", "Review", "CreativeWork", "ShortStory", "WebPage"
]);
const ALLOWED_STATUSES = new Set(["current", "evergreen", "archived", "needs-review"]);
const ALLOWED_FORMAT_SCHEMAS = new Set(["BlogPosting", "CreativeWork", "ShortStory"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assert(condition, message) {
  if (!condition) throw new Error(`Invalid site data: ${message}`);
}

function isValidTimezone(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function isSafeUrl(value, { relative = true } = {}) {
  if (typeof value !== "string" || !value.trim()) return false;
  if (relative && value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validateSettings(settings) {
  assert(settings && typeof settings === "object", "settings must be an object");
  assert(settings.site && typeof settings.site === "object", "site settings are required");
  assert(isSafeUrl(settings.site.url, { relative: false }), "site.url must be an absolute HTTP(S) URL");
  assert(Number.isInteger(settings.site.postsPerPage) && settings.site.postsPerPage > 0, "site.postsPerPage must be a positive integer");
  assert(Number.isInteger(settings.site.feedSize) && settings.site.feedSize > 0, "site.feedSize must be a positive integer");
  assert(!Number.isNaN(Date.parse(settings.site.feedFallbackDate)), "site.feedFallbackDate must be a valid date");
  assert(isValidTimezone(settings.site.timezone), "site.timezone must be an IANA timezone");

  for (const [name, image] of Object.entries(settings.site.images || {})) {
    assert(Number.isInteger(image.width) && image.width > 0 && image.width <= 4000, `site.images.${name}.width must be between 1 and 4000`);
  }
  for (const [name, url] of Object.entries(settings.site.author?.social || {})) {
    assert(isSafeUrl(url, { relative: false }), `site.author.social.${name} must be an absolute HTTP(S) URL`);
  }

  const categorySlugs = new Set();
  const categoryTopics = {};
  for (const [index, category] of (settings.categories || []).entries()) {
    assert(typeof category.name === "string" && category.name.trim(), `categories[${index}].name is required`);
    assert(SLUG_PATTERN.test(category.slug || ""), `categories[${index}].slug is invalid`);
    assert(!categorySlugs.has(category.slug), `duplicate category slug: ${category.slug}`);
    categorySlugs.add(category.slug);
    assert(ALLOWED_SCHEMAS.has(category.defaultSchema), `categories[${index}].defaultSchema is invalid`);

    const tagNames = new Set();
    const tagSlugs = new Set();
    for (const [tagIndex, tag] of (category.tags || []).entries()) {
      assert(typeof tag.name === "string" && tag.name.trim(), `categories[${index}].tags[${tagIndex}].name is required`);
      assert(!tagNames.has(tag.name), `duplicate tag '${tag.name}' in category '${category.slug}'`);
      tagNames.add(tag.name);
      const slug = topicSlug(tag.name);
      assert(slug && !tagSlugs.has(slug), `invalid or duplicate topic slug '${slug}' in category '${category.slug}'`);
      tagSlugs.add(slug);
      assert(!tag.schema || ALLOWED_SCHEMAS.has(tag.schema), `schema for tag '${tag.name}' is invalid`);
    }
    categoryTopics[category.slug] = tagNames;
  }

  const formatValues = new Set();
  for (const [index, format] of (settings.formats || []).entries()) {
    assert(SLUG_PATTERN.test(format.value || ""), `formats[${index}].value is invalid`);
    assert(typeof format.label === "string" && format.label.trim(), `formats[${index}].label is required`);
    assert(!formatValues.has(format.value), `duplicate format value: ${format.value}`);
    formatValues.add(format.value);
    assert(!format.schema || ALLOWED_FORMAT_SCHEMAS.has(format.schema), `schema for format '${format.value}' is invalid`);
  }

  return { categorySlugs, categoryTopics, formatValues };
}

function validatePost(data, categorySlugs, formatValues = new Set(), categoryTopics = {}) {
  assert(typeof data.title === "string" && data.title.trim(), "post title is required");
  assert(typeof data.description === "string" && data.description.trim(), `post '${data.title}' must define a description`);
  assert(categorySlugs.has(data.category), `unknown post category: ${data.category}`);
  assert(formatValues.has(data.format), `post '${data.title}' has an unknown format: ${data.format}`);
  assert(typeof data.published === "boolean", `post '${data.title}' must define published as a boolean`);
  assert(typeof data.pinned === "boolean", `post '${data.title}' must define pinned as a boolean`);
  assert(ALLOWED_STATUSES.has(data.status), `post '${data.title}' has an invalid status`);
  assert(data.date instanceof Date && !Number.isNaN(data.date.valueOf()), `post '${data.title}' has an invalid date`);
  if (data.updated) {
    assert(data.updated instanceof Date && !Number.isNaN(data.updated.valueOf()), `post '${data.title}' has an invalid updated date`);
    assert(data.updated >= data.date, `post '${data.title}' has updated earlier than date`);
  }
  if (data.lastVerified) {
    assert(data.lastVerified instanceof Date && !Number.isNaN(data.lastVerified.valueOf()), `post '${data.title}' has an invalid lastVerified date`);
    assert(data.lastVerified >= data.date, `post '${data.title}' has lastVerified earlier than date`);
  }
  if (data.repository) {
    assert(isSafeUrl(data.repository, { relative: false }), `post '${data.title}' has an unsafe repository URL`);
  }
  if (data.coverAlt !== undefined) {
    assert(typeof data.coverAlt === "string", `post '${data.title}' has an invalid coverAlt`);
  }
  if (data.attachments != null) {
    assert(Array.isArray(data.attachments), `post '${data.title}' attachments must be an array`);
    for (const attachment of data.attachments) {
      assert(attachment && typeof attachment === "object" && isSafeUrl(attachment.file), `post '${data.title}' has an invalid attachment URL`);
      assert(attachment.label == null || typeof attachment.label === "string", `post '${data.title}' has an invalid attachment label`);
    }
  }
  if (data.attachment) {
    assert(isSafeUrl(data.attachment), `post '${data.title}' has an invalid legacy attachment URL`);
  }

  assert(Array.isArray(data.tags), `post '${data.title}' tags must be an array`);
  assert(data.tags.every(tag => typeof tag === "string" && tag), `post '${data.title}' tags must contain non-empty strings`);
  assert(data.tags.filter(tag => tag === "post").length === 1, `post '${data.title}' must contain the reserved 'post' tag exactly once`);
  const contentTopics = data.tags.filter(tag => tag !== "post");
  assert(contentTopics.length <= 3, `post '${data.title}' cannot define more than 3 topics`);
  assert(new Set(contentTopics).size === contentTopics.length, `post '${data.title}' has duplicate topics`);

  const allowedTopics = categoryTopics[data.category] || new Set();
  for (const topic of contentTopics) {
    assert(allowedTopics.has(topic), `post '${data.title}' has topic '${topic}' outside category '${data.category}'`);
  }
}

module.exports = { ALLOWED_SCHEMAS, ALLOWED_STATUSES, isSafeUrl, validateSettings, validatePost };
