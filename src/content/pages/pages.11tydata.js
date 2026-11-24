function isDevelopment() {
  return process.env.ELEVENTY_ENV === "development";
}

module.exports = {
  eleventyComputed: {
    permalink: (data) => {
      if (!isDevelopment() && data.published === false) return false;
      return `/${data.page.fileSlug}/`;
    },
    eleventyExcludeFromCollections: (data) => !isDevelopment() && data.published === false,
  },
};
