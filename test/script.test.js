// Node test harness for assets/js/script.js
//
// The script is browser code: it attaches DOM listeners at load time and uses
// globals (document, window, fetch). To exercise its pure logic in Node without
// a browser, we install tiny stubs for the few DOM/host APIs touched during the
// top-level DOMContentLoaded handler, then run the file in a vm context so its
// top-level function declarations become inspectable globals.
//
// Run with:  node --test test/script.test.js
//
// Covered behavior:
//   - escapeRegExp neutralizes regex metacharacters (the 'c++' search crash).
//   - categorizeProject maps GitHub topics to {main, sub}.
//   - the filterProjects visibility rule, including the fix that keeps repos
//     with no language subtopic visible under All Projects.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// --- Minimal DOM/host stubs -------------------------------------------------
// Every querySelector/getElementById returns a no-op element so the top-level
// setup code in script.js runs without throwing. We never assert on DOM here.
function makeEl() {
  const el = {
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener() {},
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    appendChild() {},
    setAttribute() {},
    hasAttribute() { return true; },
    dataset: {},
    innerHTML: '',
  };
  return el;
}

const documentStub = {
  addEventListener() {},          // swallow DOMContentLoaded so nothing fires
  querySelector() { return makeEl(); },
  querySelectorAll() { return []; },
  getElementById() { return makeEl(); },
  createElement() { return makeEl(); },
  head: { appendChild() {} },
};

const sandbox = {
  document: documentStub,
  window: {},
  console,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
  IntersectionObserver: function () { return { observe() {}, unobserve() {} }; },
  setTimeout,
  clearTimeout,
};
sandbox.window = sandbox; // window.allProjects etc. resolve to the sandbox

const code = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'script.js'), 'utf8');
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const { escapeRegExp, categorizeProject } = sandbox;

// --- escapeRegExp -----------------------------------------------------------
test('escapeRegExp lets a c++ search build a valid RegExp (was the crash)', () => {
  const safe = escapeRegExp('c++');
  assert.doesNotThrow(() => new RegExp(`(${safe})`, 'gi'));
  assert.strictEqual('a c++ b'.replace(new RegExp(`(${safe})`, 'gi'), '[$1]'), 'a [c++] b');
});

test('escapeRegExp neutralizes other regex metacharacters', () => {
  for (const term of ['(', '[', '?', '.*', 'a|b', '^x$']) {
    const safe = escapeRegExp(term);
    assert.doesNotThrow(() => new RegExp(`(${safe})`, 'gi'), `term ${term} should be safe`);
  }
});

test('escapeRegExp leaves plain text searchable', () => {
  const safe = escapeRegExp('data');
  assert.strictEqual('my data set'.replace(new RegExp(`(${safe})`, 'gi'), '[$1]'), 'my [data] set');
});

// --- categorizeProject ------------------------------------------------------
// categorizeProject returns an object created inside the vm realm, whose
// prototype differs from this realm's Object. deepStrictEqual checks prototype
// identity and would fail spuriously, so we assert on the fields directly.
test('categorizeProject maps data + python', () => {
  const cat = categorizeProject({ topics: ['data-analysis', 'python'] });
  assert.strictEqual(cat.main, 'data');
  assert.strictEqual(cat.sub, 'python');
});

test('categorizeProject maps backend + go', () => {
  const cat = categorizeProject({ topics: ['backend', 'go'] });
  assert.strictEqual(cat.main, 'backend');
  assert.strictEqual(cat.sub, 'go');
});

test('categorizeProject returns a main-only category when no language subtopic', () => {
  const cat = categorizeProject({ topics: ['data'] });
  assert.strictEqual(cat.main, 'data');
  assert.strictEqual(cat.sub, undefined);
});

test('categorizeProject returns null for untagged repos', () => {
  assert.strictEqual(categorizeProject({ topics: [] }), null);
  assert.strictEqual(categorizeProject({}), null);
});

// --- filterProjects visibility rule -----------------------------------------
// Mirrors the predicate inside filterProjects so the fix is locked in by a test.
function isVisible(category, activeCategory, activeSubcategory) {
  if (!category) return false;
  if (category.main === activeCategory) {
    return !activeSubcategory ||
           category.sub === activeSubcategory ||
           category.sub === undefined;
  }
  return false;
}

test('a language-less data repo is visible under any active subtab', () => {
  const cat = categorizeProject({ topics: ['data'] }); // sub === undefined
  assert.ok(isVisible(cat, 'data', 'python'), 'should show even when Python subtab active');
  assert.ok(isVisible(cat, 'data', 'sql'), 'should show even when SQL subtab active');
});

test('a python data repo only matches the python subtab', () => {
  const cat = categorizeProject({ topics: ['data-analysis', 'python'] });
  assert.ok(isVisible(cat, 'data', 'python'));
  assert.ok(!isVisible(cat, 'data', 'sql'));
});

test('a backend repo is hidden under the data category', () => {
  const cat = categorizeProject({ topics: ['backend', 'python'] });
  assert.ok(!isVisible(cat, 'data', 'python'));
  assert.ok(isVisible(cat, 'backend', 'python'));
});
