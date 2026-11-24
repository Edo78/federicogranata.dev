const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const taxonomy = { tecnologia: ["obsidian", "koreader"], narrativa: ["scrittura", "romanzo"] };

function loadEditor(fetchOptions = {}) {
  const widgets = {};
  const events = {};
  const previews = {};
  const initialized = [];
  const root = { inert: false, setAttribute() {} };
  const notices = [];
  const frames = [];
  const backends = Object.fromEntries(["github", "proxy"].map(name => [name, {
    init(...args) {
      const read = fetchOptions.read || (async () => []);
      const backend = {
        name,
        args,
        async persistEntry() {
          if (fetchOptions.persistError) throw fetchOptions.persistError;
          return "saved";
        },
        entriesByFiles: read,
        entriesByFolder: read,
        getEntry: read,
        getMedia: read,
        [name === "github" ? "allEntriesByFolder" : "entriesByFolder"]: read,
      };
      initialized.push(backend);
      return backend;
    },
  }]));
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/public/js/admin.js"), "utf8"), {
    createClass: definition => definition,
    h: (type, props, ...children) => ({ type, props, children }),
    fetch: async () => ({ ok: fetchOptions.ok !== false, json: async () => taxonomy }),
    setTimeout,
    requestAnimationFrame: callback => frames.push(callback),
    document: {
      getElementById: () => root,
      createElement: () => ({ style: {}, setAttribute() {} }),
      body: { appendChild: notice => notices.push(notice) },
    },
    CMS: {
      getBackend: name => backends[name],
      getWidget: () => ({ control() {}, preview() {}, schema: {} }),
      registerWidget: (name, control) => { widgets[name] = control; },
      registerEventListener: event => { events[event.name] = event.handler; },
      registerPreviewStyle() {},
      registerPreviewTemplate: (name, preview) => { previews[name] = preview; },
    },
  });
  return { widgets, events, previews, backends, initialized, root, notices, flushFrame: () => frames.splice(0).forEach(callback => callback()) };
}

test("GitHub and local backends refresh the saved baseline after every persist", () => {
  const { backends, initialized } = loadEditor();
  const config = { branch: "cms-oauth" };
  for (const name of ["github", "proxy"]) {
    const backend = backends[name].init(config);
    assert.equal(backend, initialized.at(-1), "preserve the original backend instance");
    assert.equal(backend.args[0], config, "forward the backend configuration unchanged");
    assert.equal(backend.reloadEntriesAfterPersist, true);
  }
});

test("editing remains locked until the persisted entry cache has refreshed", async () => {
  for (const name of ["github", "proxy"]) {
    let finishRefresh;
    const { backends, root, notices, flushFrame } = loadEditor({ read: () => new Promise(resolve => { finishRefresh = resolve; }) });
    const backend = backends[name].init({});
    assert.equal(await backend.persistEntry(), "saved");
    assert.equal(root.inert, true, "a successful write must not unlock stale controls");
    assert.equal(notices[0].hidden, false);
    const refreshed = backend.entriesByFolder("posts");
    assert.equal(root.inert, true);
    finishRefresh([]);
    await refreshed;
    flushFrame();
    assert.equal(root.inert, true, "wait for the refreshed editor to render");
    flushFrame();
    assert.equal(root.inert, false);
    assert.equal(notices[0].hidden, true);
  }
});

test("a failed write releases the editor and preserves the original error", async () => {
  const failure = new Error("GitHub write failed");
  const { backends, root } = loadEditor({ persistError: failure });
  const backend = backends.github.init({});
  await assert.rejects(backend.persistEntry(), error => error === failure);
  assert.equal(root.inert, false);
});

test("parallel media and entry refreshes must both finish before editing resumes", async () => {
  const pending = [];
  const { backends, root, flushFrame } = loadEditor({ read: () => new Promise(resolve => pending.push(resolve)) });
  const backend = backends.github.init({});
  await backend.persistEntry();
  const entry = backend.entriesByFolder("posts");
  const media = backend.getMedia();
  pending[0]([]);
  await entry;
  flushFrame();
  flushFrame();
  assert.equal(root.inert, true);
  pending[1]([]);
  await media;
  flushFrame();
  flushFrame();
  assert.equal(root.inert, false);
});

function control(definition, props) {
  const instance = { props, state: {}, setState(value, callback) { Object.assign(this.state, value); callback?.(); } };
  for (const [name, method] of Object.entries(definition)) instance[name] = method.bind(instance);
  if (instance.getInitialState) instance.state = instance.getInitialState();
  return instance;
}

test("topics follow the category draft immediately instead of the stale entry prop", async () => {
  const { widgets } = loadEditor();
  const category = control(widgets["category-select"], { value: undefined, onChange(value) { category.props.value = value; } });
  category.componentDidMount();
  const topics = control(widgets["category-tags"], {
    value: [],
    entry: { getIn: () => "opinioni" }, // Decap's persisted entry is not the draft.
    onChange(value) { topics.props.value = value; },
  });
  topics.componentDidMount();
  await new Promise(setImmediate);
  assert.equal(topics.state.category, "");
  category.handleChange("tecnologia");
  assert.equal(topics.state.category, "tecnologia");
  topics.handleChange({ target: { selectedOptions: [{ value: "obsidian" }] } });
  assert.deepEqual(Array.from(topics.props.value), ["obsidian"]);
  category.handleChange("narrativa");
  assert.equal(topics.state.category, "narrativa");
  assert.deepEqual(Array.from(topics.props.value), []);
  assert.deepEqual(topics.state.categoryTags.narrativa, ["scrittura", "romanzo"]);
  topics.componentWillUnmount();
  category.handleChange("tecnologia");
  assert.equal(topics.state.category, "narrativa", "unmounted controls must unsubscribe");
});

test("existing selections are reconciled after taxonomy loads", async () => {
  const { widgets } = loadEditor();
  const category = control(widgets["category-select"], { value: "tecnologia" });
  category.componentDidMount();
  const topics = control(widgets["category-tags"], {
    value: { toJS: () => ["obsidian", "scrittura"] },
    onChange(value) { topics.props.value = value; },
  });
  topics.componentDidMount();
  await new Promise(setImmediate);
  assert.deepEqual(Array.from(topics.props.value), ["obsidian"]);
  topics.componentWillUnmount();
});

test("preSave removes topics outside the actual draft category and deduplicates them", async () => {
  const { events } = loadEditor();
  const data = new Map([["category", "narrativa"], ["tags", ["obsidian", "scrittura", "scrittura"]]]);
  const result = await events.preSave({ entry: new Map([["data", data]]) });
  assert.deepEqual(Array.from(result.get("tags")), ["scrittura"]);
  const settings = new Map([["site", {}]]);
  assert.equal(await events.preSave({ entry: new Map([["data", settings]]) }), settings);
});

test("preSave rejects a failed taxonomy request rather than saving unchecked topics", async () => {
  const { events } = loadEditor({ ok: false });
  const data = new Map([["category", "tecnologia"], ["tags", ["obsidian"]]]);
  await assert.rejects(events.preSave({ entry: new Map([["data", data]]) }), /Impossibile caricare i topic/);
});

test("editorial preview follows the draft status and current posts have no notice", () => {
  const { previews } = loadEditor();
  let status = "needs-review";
  const preview = control(previews.posts, {
    entry: { getIn: keys => ({ category: "tecnologia", status })[keys[1]] },
    widgetFor: () => "Body",
  });
  const notices = node => {
    if (!node || typeof node !== "object") return [];
    return [...(node.type === "aside" ? [node] : []), ...node.children.flat(Infinity).flatMap(notices)];
  };
  assert.equal(notices(preview.render())[0].children[0].children[0], "Da rivedere");
  status = "archived";
  assert.equal(notices(preview.render())[0].children[0].children[0], "Archivio");
  status = "current";
  assert.equal(notices(preview.render()).length, 0);
  status = "evergreen";
  assert.equal(notices(preview.render()).length, 0);
});
