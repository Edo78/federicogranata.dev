const { DateTime } = require('luxon');
const settings = require('../settings.json');

// Allowed schema types — guards against free-text injection from front matter
const VALID_SCHEMAS = new Set([
  'BlogPosting', 'HowTo', 'Review', 'CreativeWork', 'ShortStory', 'WebPage'
]);

/**
 * Resolve structured data from an explicit content format. Topics stay
 * editorial and no longer silently change the machine-readable document type.
 *
 * @param {string} postFormat - Format from the post front matter
 * @param {string} categorySlug - The post's category slug
 * @param {object} [siteSettings] - Current settings snapshot for this build
 * @returns {string} Schema type name (e.g., "BlogPosting", "HowTo")
 */
function resolveSchema(postFormat, categorySlug, siteSettings = settings) {
  const category = siteSettings.categories.find(c => c.slug === categorySlug);
  if (!category) return 'WebPage';

  const formatSchema = siteSettings.formats?.find(format => format.value === postFormat)?.schema;
  if (formatSchema && VALID_SCHEMAS.has(formatSchema)) return formatSchema;

  const def = category.defaultSchema;
  return VALID_SCHEMAS.has(def) ? def : 'BlogPosting';
}

/**
 * Build the JSON-LD schema object for a post.
 *
 * @param {object} params
 * @param {string} params.schemaType - Resolved schema type (from resolveSchema)
 * @param {string} params.siteUrl - Base site URL
 * @param {string} params.authorName - Author name
 * @param {object} params.ctx - Template context (title, description, date, updated, cover, page, format, tags)
 * @returns {object} JSON-LD schema object (no @context — caller adds it)
 */
function buildJsonLdSchema({ schemaType, siteUrl, authorName, ctx }) {
  // Fall back to BlogPosting if required fields for structured types are absent
  if (schemaType === "HowTo" && (!ctx.steps || !ctx.steps.length)) {
    schemaType = "BlogPosting";
  }
  if (schemaType === "Review" && !ctx.reviewedItem) {
    schemaType = "BlogPosting";
  }

  const pageUrl = siteUrl + (ctx.page?.url || "");
  const contentTags = (ctx.tags || []).filter((tag) => tag !== "post");
  const primaryTag = contentTags[0] || null;
  const jsonldType = schemaType === "ShortStory" ? "CreativeWork" : schemaType;

  const schema = {
    "@type": jsonldType,
    author: { "@type": "Person", name: authorName },
  };

  if (schemaType === "ShortStory") {
    schema.additionalType = "https://schema.org/ShortStory";
  }

  const isoDate = (d) => {
    if (!d) return null;
    if (d instanceof Date) return DateTime.fromJSDate(d, { zone: "utc" }).toISO();
    if (typeof d === "string") return DateTime.fromISO(d, { zone: "utc" }).toISO();
    return String(d);
  };

  const effectiveModifiedDate = [ctx.date, ctx.updated, ctx.lastVerified]
    .filter(Boolean)
    .reduce((latest, value) => {
      const candidate = new Date(value);
      return !latest || candidate > latest ? candidate : latest;
    }, null);

  if (schemaType === "HowTo") {
    schema.name = ctx.title || "";
    schema.description = ctx.description || "";
    schema.url = pageUrl;
    if (ctx.steps && ctx.steps.length) {
      schema.step = ctx.steps.map(s => ({ "@type": "HowToStep", text: s }));
    }
  } else if (schemaType === "Review") {
    schema.name = ctx.title || "";
    schema.description = ctx.description || "";
    schema.datePublished = isoDate(ctx.date);
    schema.url = pageUrl;
    if (ctx.reviewedItem) {
      schema.itemReviewed = {
        "@type": ctx.reviewedItemType || "Thing",
        name: ctx.reviewedItem,
      };
    }
  } else if (schemaType === "WebPage") {
    schema.name = ctx.title || "";
    schema.description = ctx.description || "";
    schema.url = pageUrl;
  } else if (schemaType === "CreativeWork" || schemaType === "ShortStory") {
    schema.name = ctx.title || "";
    schema.description = ctx.description || "";
    schema.datePublished = isoDate(ctx.date);
    schema.dateModified = isoDate(effectiveModifiedDate || ctx.date);
    schema.url = pageUrl;
    if (primaryTag || ctx.category) {
      schema.genre = primaryTag || ctx.category;
    }
    if (ctx.coverUrl || ctx.cover) {
      schema.image = siteUrl + (ctx.coverUrl || ctx.cover);
    }
  } else {
    // BlogPosting
    schema.headline = ctx.title || "";
    schema.description = ctx.description || "";
    schema.datePublished = isoDate(ctx.date);
    schema.dateModified = isoDate(effectiveModifiedDate || ctx.date);
    schema.url = pageUrl;
    if (ctx.coverUrl || ctx.cover) {
      schema.image = siteUrl + (ctx.coverUrl || ctx.cover);
    }
  }

  return schema;
}

module.exports = { resolveSchema, VALID_SCHEMAS, buildJsonLdSchema };
