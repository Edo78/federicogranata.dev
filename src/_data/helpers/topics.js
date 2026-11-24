function topicSlug(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function topicUrl(category, name) {
  return `/${category}/tag/${topicSlug(name)}/`;
}

module.exports = { topicSlug, topicUrl };
