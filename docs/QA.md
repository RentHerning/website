# QA report

*1 November 2026 · checked against `main` with the 3D city v2 (#9) and the help flow (#8) merged in*

The site was checked in a headless Chromium at five widths, covering a small phone (360 px), a tablet (768 px), a small laptop (1024 px), a desktop (1440 px) and a 27"/4K-class screen (2560 px). Every page was loaded in both languages: the home page, Ledige boliger, two listing pages, the help page and the 404 page. The checks looked for content wider than the screen, JavaScript errors and accessibility problems (axe-core, WCAG 2 A/AA plus best practices). The listing photos were replaced by local stand-ins, because the test machine can't reach Boligportal's image server; the photos themselves were checked separately in a normal browser.

| Check | Result |
|---|---|
| Horizontal overflow, 5 widths × 10 pages | None |
| JavaScript errors | None |
| axe-core violations (360 and 1440 px) | None (38–42 checks passing per page) |
| Colour contrast | Not decidable by axe over gradients and photos; the text colours were chosen to meet AA (body 16:1, secondary 7.6:1, smallest 4.9:1 on the page background) |
| Keyboard | Skip link appears on the first Tab, every interactive element has a visible focus ring, the photo viewer and the mobile menu close with Esc |

Lighthouse was run in its mobile mode (slow 4G and a throttled CPU), which is the strictest setting. The scores are below. The home page's largest element on phones is the still image of the city, which is now preloaded; on capable devices the live 3D scene fades in over it once the page is idle, so it never delays the text.

| Page | Performance | Accessibility | Best practices | SEO | Largest paint | Layout shift |
|---|---|---|---|---|---|---|
| Home | 94 | 100 | 96 | 100 | 3.0 s | 0 |
| Ledige boliger | 96 | 100 | 96 | 100 | 2.4 s | 0 |
| Listing | 97 | 100 | 96 | 100 | 2.3 s | 0 |
| Hjælp & kontakt | 96 | 100 | 100 | 100 | 2.4 s | 0 |

The few "best practices" points lost are the blocked test images, not the site. GitHub Pages also compresses HTML, CSS and JavaScript, which the local test server did not, so the live numbers should be slightly better.

## Still to check on the live demo

Real phones (an iPhone and a mid-range Android) for the 3D scene's smoothness and the swipe gallery; the first run of the scheduled listings update from GitHub's servers; and the forms once `FORM_ENDPOINT` is set.
