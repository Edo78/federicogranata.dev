const { test } = require("node:test");
const assert = require("node:assert/strict");
const { attachmentLinks } = require("../src/_data/helpers/attachments.js");

test("PDF and EPUB downloads retain their labels and order", () => {
  assert.deepEqual(attachmentLinks([
    { file: "/files/story.pdf", label: "Scarica PDF" },
    { file: "/files/story.epub", label: "Scarica EPUB" },
  ]), [
    { file: "/files/story.pdf", label: "Scarica PDF" },
    { file: "/files/story.epub", label: "Scarica EPUB" },
  ]);
});

test("legacy attachments remain downloadable without duplicate links", () => {
  assert.deepEqual(attachmentLinks(undefined, "/files/old.pdf"), [{ file: "/files/old.pdf", label: "Scarica old.pdf" }]);
  assert.deepEqual(attachmentLinks([{ file: "/files/old.pdf", label: "PDF" }], "/files/old.pdf"), [{ file: "/files/old.pdf", label: "PDF" }]);
  assert.deepEqual(attachmentLinks([], ""), []);
});

test("unlabelled attachments use readable filenames", () => {
  assert.deepEqual(attachmentLinks([{ file: "/files/Story%20print.pdf", label: "  " }]), [{ file: "/files/Story%20print.pdf", label: "Scarica Story print.pdf" }]);
});
