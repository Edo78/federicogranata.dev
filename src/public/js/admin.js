let activeSaves = 0;
let savingNotice;
function setSaveLock(change) {
  activeSaves = Math.max(0, activeSaves + change);
  const busy = activeSaves > 0;
  const root = document.getElementById("nc-root");
  if (root) {
    root.inert = busy;
    root.setAttribute("aria-busy", String(busy));
  }
  if (!savingNotice) {
    savingNotice = document.createElement("div");
    savingNotice.setAttribute("role", "status");
    savingNotice.setAttribute("aria-live", "polite");
    savingNotice.textContent = "Salvataggio e aggiornamento dell’editor…";
    savingNotice.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(255,255,255,.78);color:#20313a;font:16px system-ui,sans-serif;text-align:center;padding-top:25vh;cursor:progress";
    document.body.appendChild(savingNotice);
  }
  savingNotice.hidden = !busy;
}

// Decap compares edits with its cached entries. Refresh that cache after each
// save, otherwise reverting to an earlier saved value is mistaken for no change.
// reloadEntriesAfterPersist is handled natively by the pinned Decap 3.18 client.
for (const name of ["github", "proxy"]) {
  const registration = CMS.getBackend(name);
  const initialize = registration.init;
  registration.init = (...args) => {
    const backend = initialize(...args);
    backend.reloadEntriesAfterPersist = true;
    let waitingForRefresh = false;
    let activeReads = 0;
    const readAll = typeof backend.allEntriesByFolder === "function" ? backend.allEntriesByFolder.bind(backend) : null;
    const release = () => {
      if (!waitingForRefresh) return;
      waitingForRefresh = false;
      setSaveLock(-1);
    };
    const persist = backend.persistEntry.bind(backend);
    backend.persistEntry = async (...values) => {
      if (!waitingForRefresh) {
        waitingForRefresh = true;
        setSaveLock(1);
      }
      try {
        return await persist(...values);
      } catch (error) {
        release();
        throw error;
      }
    };
    // Keep controls locked until the native refresh has reached Redux. Decap
    // resets its saving flag before this request completes, so otherwise a fast
    // edit can still be compared with (or replaced by) the previous snapshot.
    for (const method of ["allEntriesByFolder", "entriesByFolder", "entriesByFiles", "getEntry", "getMedia"]) {
      if (typeof backend[method] !== "function") continue;
      const read = backend[method].bind(backend);
      backend[method] = async (...values) => {
        const refreshing = waitingForRefresh;
        if (refreshing) activeReads++;
        try {
          // Refresh older entries too, even if the edited post is not on the
          // first GitHub collection page. Proxy reads already return all files.
          if (refreshing && method === "entriesByFolder" && readAll) return await readAll(...values);
          return await read(...values);
        } finally {
          if (refreshing) {
            activeReads--;
            requestAnimationFrame(() => requestAnimationFrame(() => {
              if (activeReads === 0) release();
            }));
          }
        }
      };
    }
    return backend;
  };
}

// Controls receive a stale `entry` in Decap. Forward the category control's
// actual draft value instead of polling the persisted entry.
const categoryContext = {
  value: "",
  listeners: new Set(),
  publish(value) {
    this.value = value || "";
    this.listeners.forEach(listener => listener(this.value));
  },
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.value);
    return () => this.listeners.delete(listener);
  },
};

function normalizeTopics(value) {
  if (Array.isArray(value)) return value;
  if (value?.toJS) return value.toJS();
  return [];
}

function validTopics(value, category, taxonomy) {
  const allowed = taxonomy[category] || [];
  return [...new Set(normalizeTopics(value))].filter(topic => allowed.includes(topic)).slice(0, 3);
}

let taxonomyRequest;
function loadTaxonomy() {
  if (!taxonomyRequest) {
    taxonomyRequest = fetch("/admin/taxonomy.json", { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error("Impossibile caricare i topic. Riprova prima di salvare.");
        return response.json();
      })
      .catch(error => {
        taxonomyRequest = null;
        throw error;
      });
  }
  return taxonomyRequest;
}

const SelectWidget = CMS.getWidget("select");
const CategorySelectControl = createClass({
  componentDidMount() {
    categoryContext.publish(this.props.value);
  },
  componentDidUpdate(previousProps) {
    if (previousProps.value !== this.props.value) categoryContext.publish(this.props.value);
  },
  handleChange(value) {
    this.props.onChange(value);
    categoryContext.publish(value);
  },
  render() {
    return h(SelectWidget.control, { ...this.props, onChange: this.handleChange.bind(this) });
  },
});

CMS.registerWidget("category-select", CategorySelectControl, SelectWidget.preview, SelectWidget.schema);

const CategoryTagsControl = createClass({
  getInitialState() {
    return { category: "", categoryTags: {}, loaded: false, error: false };
  },
  componentDidMount() {
    this.unsubscribe = categoryContext.subscribe(category => {
      this.setState({ category }, () => this.removeInvalidTopics());
    });
    this.loadOptions();
  },
  componentWillUnmount() {
    this.unsubscribe();
  },
  loadOptions() {
    this.setState({ error: false });
    loadTaxonomy()
      .then(categoryTags => this.setState({ categoryTags, loaded: true }, () => this.removeInvalidTopics()))
      .catch(() => this.setState({ error: true }));
  },
  removeInvalidTopics() {
    if (!this.state.loaded) return;
    const current = normalizeTopics(this.props.value);
    const valid = validTopics(current, this.state.category, this.state.categoryTags);
    if (current.length !== valid.length || current.some((topic, index) => topic !== valid[index])) {
      this.props.onChange(valid);
    }
  },
  handleChange(event) {
    const selected = Array.from(event.target.selectedOptions, option => option.value);
    if (selected.length <= 3) this.props.onChange(validTopics(selected, this.state.category, this.state.categoryTags));
  },
  render() {
    const { category, categoryTags, loaded, error } = this.state;
    if (!category) return h("p", {}, "Seleziona prima una categoria");
    if (error) return h("div", {},
      h("p", { role: "alert" }, "Impossibile caricare i topic."),
      h("button", { type: "button", onClick: this.loadOptions.bind(this) }, "Riprova")
    );
    if (!loaded) return h("p", {}, "Caricamento topic…");

    const tags = categoryTags[category] || [];
    const value = validTopics(this.props.value, category, categoryTags);
    return h("div", {},
      h("select", {
        id: this.props.forID,
        className: this.props.classNameWrapper,
        multiple: true,
        disabled: tags.length === 0,
        value,
        onChange: this.handleChange.bind(this),
        style: { width: "100%", minHeight: "120px", padding: "8px" },
      }, tags.map(tag => h("option", { key: tag, value: tag }, tag))),
      h("p", { style: { fontSize: "12px", color: "#888", marginTop: "4px" } },
        tags.length ? `Max 3 topic. Selezionati: ${value.length}/3` : "Nessun topic configurato per questa categoria."
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

// Validate against the saved draft too, even if a control has not mounted yet.
CMS.registerEventListener({
  name: "preSave",
  handler: async ({ entry }) => {
    const data = entry.get("data");
    const category = data.get("category");
    if (!category) return data;
    const taxonomy = await loadTaxonomy();
    return data.set("tags", validTopics(data.get("tags"), category, taxonomy));
  },
});
CMS.registerPreviewStyle("/css/style.css");

const PostPreview = createClass({
  render() {
    const entry = this.props.entry;
    const title = entry.getIn(["data", "title"]) || "Titolo dell'articolo";
    const description = entry.getIn(["data", "description"]);
    const category = entry.getIn(["data", "category"]) || "Articolo";
    const status = entry.getIn(["data", "status"]) || "current";
    const statusLabel = { current: "Corrente", evergreen: "Evergreen", "needs-review": "Da rivedere", archived: "Archivio" }[status];
    const cover = entry.getIn(["data", "cover"]);
    const coverAlt = entry.getIn(["data", "coverAlt"]) || "";
    const coverAsset = cover ? this.props.getAsset(cover) : null;
    const tags = entry.getIn(["data", "tags"]);
    const tagList = normalizeTopics(tags);

    return h("main", { className: "max-w-6xl mx-auto px-4 py-8" },
      h("article", { className: "article-shell" },
        h("header", { className: "article-header" },
          h("p", { className: "eyebrow" }, category + (status !== "current" && statusLabel ? ` / ${statusLabel}` : "")),
          h("h1", { className: "display-title mt-3 text-4xl sm:text-5xl text-text-strong" }, title),
          description && h("p", { className: "lead-text mt-5 text-text-soft" }, description),
          tagList.length > 0 && h("div", { className: "mt-5 flex flex-wrap gap-3" },
            tagList.map((tag) => h("span", { className: "topic-label", key: tag }, `#${tag}`))
          )
        ),
        coverAsset && h("div", { className: "post-cover mt-8 overflow-hidden" },
          h("img", { src: coverAsset.toString(), alt: coverAlt })
        ),
        ["archived", "needs-review"].includes(status) && h("aside", { className: "editorial-status mt-8", "aria-label": "Stato editoriale" },
          h("span", { className: "eyebrow" }, statusLabel),
          h("p", {}, status === "archived"
            ? "Questo testo resta online come documento storico. Le informazioni tecniche possono non descrivere più il progetto attuale."
            : "Il contesto resta utile, ma strumenti e dettagli tecnici potrebbero essere cambiati dalla pubblicazione.")
        ),
        h("div", { className: "prose prose-lg mt-10 max-w-none" }, this.props.widgetFor("body"))
      )
    );
  },
});

CMS.registerPreviewTemplate("posts", PostPreview);
