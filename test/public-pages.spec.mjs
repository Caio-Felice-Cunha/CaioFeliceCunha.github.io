import { expect, test } from '@playwright/test';

const publishedPages = [
  ['DrumAI', 'https://caio-felice-cunha.github.io/drumai-demo/'],
  ['Scoopy', 'https://caio-felice-cunha.github.io/scoopy-demo/'],
  ['MorarFora', 'https://caio-felice-cunha.github.io/morarfora-case-study/'],
  ['Supply Chain', 'https://caio-felice-cunha.github.io/Supply-Chain-Intelligence-Hub/'],
  ['LinkedIn / X', 'https://caio-felice-cunha.github.io/linkedin-x-scheduler/'],
  ['Instagram', 'https://caio-felice-cunha.github.io/instagram-reels-poster/'],
  ['YouTube', 'https://caio-felice-cunha.github.io/youtube-shorts-scheduler/'],
];

for (const [name, url] of publishedPages) {
  test('published ' + name + ' page is usable', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    const response = await page.goto(url, { waitUntil: 'load' });
    expect(response?.ok(), url + ' should return a successful document').toBe(true);
    await expect(page.getByRole('heading').first()).toBeVisible();
    const layout = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
    expect(consoleErrors).toEqual([]);
  });
}
