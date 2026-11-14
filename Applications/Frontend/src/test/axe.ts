import { configureAxe } from 'vitest-axe';

/**
 * axe-core for component and screen tests. jsdom has no layout or computed colors, so
 * color-contrast is checked in the browser (Playwright + axe) instead.
 */
const runAxe = configureAxe({ rules: { 'color-contrast': { enabled: false } } });

/** Fails with a readable list when axe finds any violation in `container`. */
export async function expectNoAxeViolations(
  container: Element = document.body,
  options: { landmarks?: boolean } = {},
) {
  const results = await runAxe(container, {
    // A component on its own isn't inside the app's landmarks.
    rules: options.landmarks === false ? { region: { enabled: false } } : {},
  });
  const problems = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}\n` +
      violation.nodes.map((node) => `  - ${node.target.join(' ')}`).join('\n'),
  );
  expect(problems, problems.join('\n')).toEqual([]);
}
