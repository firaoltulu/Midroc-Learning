import { useRouterState } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/** How long to wait for a page's h1 after navigating (content behind a query loads later). */
const HEADING_TIMEOUT_MS = 5_000;

const pageHeading = (main: HTMLElement) => main.querySelector('h1');

const FIELDS = 'input, textarea, select, [contenteditable="true"]';

/**
 * Page titles and focus on navigation (single-page app; WCAG 2.4.2 and 2.4.3):
 * - `document.title` follows the page's h1 ("Courses – Midroc Learning"), also when the
 *   heading appears after loading or changes language;
 * - after a path change (not a search-param change such as a filter), focus moves to the new
 *   page's h1, so screen readers announce the page and keyboard users start at its top. A page
 *   that focused a field itself (autofocus) keeps that focus.
 */
export function PageFocus({ mainId }: { mainId: string }) {
  const { t } = useTranslation('common');
  // The location once its page has loaded (not the pending one), so the new page is on screen.
  const pathname = useRouterState({ select: (state) => state.resolvedLocation?.pathname });
  const appName = t('appName');
  const previousPath = useRef(pathname);

  // Title: follow the h1 of whatever the main landmark shows.
  useEffect(() => {
    const main = document.getElementById(mainId);
    if (!main) return;
    const update = () => {
      const heading = pageHeading(main)?.textContent.trim();
      const title = heading ? t('shell.pageTitle', { page: heading, app: appName }) : appName;
      if (document.title !== title) document.title = title;
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
    };
  }, [mainId, appName, t]);

  // Focus: after navigating to another page, once its heading is there.
  useEffect(() => {
    const previous = previousPath.current;
    previousPath.current = pathname;
    // First load, or the same page (only search params changed): leave focus where it is.
    if (previous === undefined || pathname === undefined || previous === pathname) return;
    const main = document.getElementById(mainId);
    if (!main) return;

    const focusHeading = () => {
      const active = document.activeElement;
      // The new page focused a field itself (autofocus), or a dialog is open: leave it.
      if (active instanceof HTMLElement && main.contains(active) && active.matches(FIELDS)) {
        return true;
      }
      if (active instanceof HTMLElement && active.closest('[role="dialog"]')) return true;
      const heading = pageHeading(main);
      if (!heading) return false;
      if (!heading.hasAttribute('tabindex')) {
        heading.setAttribute('tabindex', '-1');
        // Focused only to announce the page: no ring on something that isn't interactive.
        heading.style.outline = 'none';
      }
      heading.focus({ preventScroll: true });
      return true;
    };

    if (focusHeading()) return;
    const observer = new MutationObserver(() => {
      if (focusHeading()) stop();
    });
    const timer = window.setTimeout(() => {
      stop();
      // No heading (yet): at least start from the main landmark.
      if (!main.contains(document.activeElement)) main.focus({ preventScroll: true });
    }, HEADING_TIMEOUT_MS);
    function stop() {
      observer.disconnect();
      window.clearTimeout(timer);
    }
    observer.observe(main, { childList: true, subtree: true });
    return stop;
  }, [pathname, mainId]);

  return null;
}
