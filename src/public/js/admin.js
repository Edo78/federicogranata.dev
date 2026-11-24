// Category-aware topic selector. Taxonomy comes from the current build so an
// editor cannot accidentally assign a topic to the wrong section.
const CategoryTagsControl = createClass({
  normalizeTags(value) {
    if (Array.isArray(value)) return value;
    if (value?.toJS) return value.toJS();
    return [];
  },

  getInitialState() {
    return { category: "", categoryTags: {} };
  },

  componentDidMount() {
    fetch("/admin/taxonomy.json", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        this.setState({ categoryTags: data }, () => {
          const category = this.state.category;
          if (!category) return;
          const allowedTags = data[category] || [];
          const currentTags = this.normalizeTags(this.props.value);
          const validTags = currentTags.filter((tag) => allowedTags.includes(tag));
          if (validTags.length !== currentTags.length) this.props.onChange(validTags);
        });
      })
      .catch(() => {});

    this.interval = setInterval(() => {
      const category = this.props.entry.getIn(["data", "category"]);
      if (category === this.state.category) return;

      const allowedTags = this.state.categoryTags[category];
      if (allowedTags !== undefined) {
        const currentTags = this.normalizeTags(this.props.value);
        const validTags = currentTags.filter((tag) => allowedTags.includes(tag));
        if (validTags.length !== currentTags.length) this.props.onChange(validTags);
      }
      this.setState({ category });
    }, 300);
  },

  componentWillUnmount() {
    clearInterval(this.interval);
  },

  handleChange(event) {
    const selected = Array.from(event.target.selectedOptions, (option) => option.value);
    if (selected.length <= 3) this.props.onChange(selected);
  },

  render() {
    const value = this.normalizeTags(this.props.value);
    const category = this.state.category;
    const tags = this.state.categoryTags[category] || [];

    if (!category) return h("p", { style: { color: "#888" } }, "Seleziona prima una categoria");

    return h("div", {},
      h("select", {
        multiple: true,
        value,
        onChange: this.handleChange.bind(this),
        style: { width: "100%", minHeight: "120px", padding: "8px" },
      }, tags.map((tag) => h("option", { key: tag, value: tag }, tag))),
      h("p", { style: { fontSize: "12px", color: "#888", marginTop: "4px" } },
        `Max 3 topic. Selezionati: ${value.length}/3`
      )
    );
  },
});

const CategoryTagsPreview = createClass({
  render() {
    const rawValue = this.props.value;
    const value = Array.isArray(rawValue) ? rawValue : rawValue?.toJS ? rawValue.toJS() : [];
    return h("div", {}, value.join(", "));
  },
});

CMS.registerWidget("category-tags", CategoryTagsControl, CategoryTagsPreview);
CMS.registerPreviewStyle("/css/style.css");

const PostPreview = createClass({
  render() {
    const entry = this.props.entry;
    const title = entry.getIn(["data", "title"]) || "Titolo dell'articolo";
    const description = entry.getIn(["data", "description"]);
    const category = entry.getIn(["data", "category"]) || "Articolo";
    const cover = entry.getIn(["data", "cover"]);
    const coverAlt = entry.getIn(["data", "coverAlt"]) || "";
    const coverAsset = cover ? this.props.getAsset(cover) : null;
    const tags = entry.getIn(["data", "tags"]);
    const tagList = tags && tags.toJS ? tags.toJS() : [];

    return h("main", { className: "max-w-6xl mx-auto px-4 py-8" },
      h("article", { className: "article-shell" },
        h("header", { className: "article-header" },
          h("p", { className: "eyebrow" }, category),
          h("h1", { className: "display-title mt-3 text-4xl sm:text-5xl text-text-strong" }, title),
          description && h("p", { className: "lead-text mt-5 text-text-soft" }, description),
          tagList.length > 0 && h("div", { className: "mt-5 flex flex-wrap gap-3" },
            tagList.map((tag) => h("span", { className: "topic-label", key: tag }, `#${tag}`))
          )
        ),
        coverAsset && h("div", { className: "post-cover mt-8 overflow-hidden" },
          h("img", { src: coverAsset.toString(), alt: coverAlt })
        ),
        h("div", { className: "prose prose-lg mt-10 max-w-none" }, this.props.widgetFor("body"))
      )
    );
  },
});

CMS.registerPreviewTemplate("posts", PostPreview);
