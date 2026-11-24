const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveSchema, VALID_SCHEMAS, buildJsonLdSchema } = require('../src/_data/helpers/schema.js');

test('racconto format resolves to ShortStory', () => {
  assert.equal(resolveSchema('racconto', 'narrativa'), 'ShortStory');
});

test('ShortStory is in VALID_SCHEMAS', () => {
  assert.ok(VALID_SCHEMAS.has('ShortStory'));
});

test('opinione format resolves to BlogPosting', () => {
  assert.equal(resolveSchema('opinione', 'opinioni'), 'BlogPosting');
});

test('format without schema in narrativa falls back to CreativeWork', () => {
  assert.equal(resolveSchema('nota', 'narrativa'), 'CreativeWork');
});

test('format without schema in tecnologia falls back to BlogPosting', () => {
  assert.equal(resolveSchema('nota', 'tecnologia'), 'BlogPosting');
});

test('unknown format falls back to the category default', () => {
  assert.equal(resolveSchema('unknown', 'opinioni'), 'BlogPosting');
});

test('unknown category returns WebPage', () => {
  assert.equal(resolveSchema('nota', 'nonexistent'), 'WebPage');
});

const SITE_URL = 'https://example.com';
const AUTHOR = 'Test Author';

test('ShortStory produces CreativeWork metadata with additionalType', () => {
  const schema = buildJsonLdSchema({
    schemaType: 'ShortStory',
    siteUrl: SITE_URL,
    authorName: AUTHOR,
    ctx: {
      title: 'My Story',
      description: 'A short story',
      date: new Date('2026-01-01'),
      tags: ['racconto']
    }
  });

  assert.equal(schema['@type'], 'CreativeWork');
  assert.equal(schema.additionalType, 'https://schema.org/ShortStory');
  assert.equal(schema.name, 'My Story');
  assert.equal(schema.genre, 'racconto');
});

test('BlogPosting keeps headline and uses cover URL as image', () => {
  const schema = buildJsonLdSchema({
    schemaType: 'BlogPosting',
    siteUrl: SITE_URL,
    authorName: AUTHOR,
    ctx: {
      title: 'My Post',
      description: 'A blog post',
      date: new Date('2026-01-01'),
      updated: new Date('2026-01-02'),
      lastVerified: new Date('2026-01-03'),
      cover: '/src/assets/images/cover.jpg'
    }
  });

  assert.equal(schema['@type'], 'BlogPosting');
  assert.equal(schema.additionalType, undefined);
  assert.equal(schema.headline, 'My Post');
  assert.equal(schema.image, 'https://example.com/src/assets/images/cover.jpg');
  assert.match(schema.dateModified, /^2026-01-03/);
});

test('HowTo schema includes step array', () => {
  const schema = buildJsonLdSchema({
    schemaType: 'HowTo',
    siteUrl: SITE_URL,
    authorName: AUTHOR,
    ctx: { title: 'How to test', description: 'desc', steps: ['Step 1', 'Step 2'] }
  });

  assert.equal(schema['@type'], 'HowTo');
  assert.equal(schema.step.length, 2);
  assert.equal(schema.step[0]['@type'], 'HowToStep');
});
