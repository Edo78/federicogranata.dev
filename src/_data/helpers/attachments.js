const path = require("node:path");

function attachmentLinks(attachments, legacyAttachment) {
  const files = Array.isArray(attachments) ? [...attachments] : [];
  if (legacyAttachment) files.push({ file: legacyAttachment });
  const seen = new Set();

  return files.flatMap(item => {
    if (!item || typeof item.file !== "string" || !item.file.trim()) return [];
    const file = item.file.trim();
    if (seen.has(file)) return [];
    seen.add(file);
    let filename = path.posix.basename(file.split(/[?#]/)[0]);
    try {
      filename = decodeURIComponent(filename);
    } catch {
      // Keep a readable fallback even if a legacy URL has a malformed escape.
    }
    const label = typeof item.label === "string" ? item.label.trim() : "";
    return [{ file, label: label || `Scarica ${filename}` }];
  });
}

module.exports = { attachmentLinks };
