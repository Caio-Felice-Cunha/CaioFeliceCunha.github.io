const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('portfolio contains exactly nine curated projects in four groups', () => {
  assert.equal((html.match(/data-project=/g) || []).length, 9);
  const groups = [...html.matchAll(/data-group="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(groups)], ['AI Products', 'Live Products', 'Browser Automation', 'Data Engineering']);
});

test('every project uses a standardized public state', () => {
  const allowed = new Set(['Live product', 'Interactive demo', 'Replay demo', 'Local runnable']);
  const states = [...html.matchAll(/data-state="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(states.length, 9);
  states.forEach((state) => assert.ok(allowed.has(state), 'unexpected state: ' + state));
});

test('curated presentation has no automatic repository feed or unsupported legacy claims', () => {
  assert.doesNotMatch(html, /api\.github\.com|fetchGitHubProjects|Power BI dashboards|real 13-post week/i);
});

test('blocked flagships do not expose unpublished case links', () => {
  for (const id of ['redax-juris', 'voxpage']) {
    const start = html.indexOf('data-project="' + id + '"');
    const end = html.indexOf('</article>', start);
    const card = html.slice(start, end);
    assert.match(card, /Security gate pending/);
    assert.doesNotMatch(card, /github\.com\/Caio-Felice-Cunha\/(redaxjuris|voxpage)-case-study/);
  }
});

test('public project cards link to their expected demo or report routes', () => {
  for (const slug of ['drumai-demo', 'morarfora-case-study', 'scoopy-demo', 'linkedin-x-scheduler', 'instagram-reels-poster', 'youtube-shorts-scheduler', 'Supply-Chain-Intelligence-Hub']) {
    assert.ok(html.includes('github.io/' + slug + '/'), 'missing Pages link for ' + slug);
  }
});

test('excluded project names are absent', () => {
  assert.doesNotMatch(html, /Mega\s*Brain/i);
});

