// Rent Herning logo, redrawn as vector from the original 180 px PNG on rentherning.dk.
// The text uses the site's Montserrat, so the SVG is inlined (not used as <img>).
export const LOGO_MARK_PATH =
  'M151 186 L349 74 Q355 70 361 74 L561 186 Q567 190 567 197 L567 524 Q567 530 561 530 L436 530 Q430 530 427 525 L376 420 Q374 415 380 413 Q428 398 428 357 Q428 300 372 300 L296 300 Q290 300 290 306 L290 518 Q290 530 278 530 L151 530 Q145 530 145 524 L145 197 Q145 190 151 186 Z';

export function logoSvg({ title = 'Rent Herning', withWordmark = true, className = 'logo' } = {}) {
  const vb = withWordmark ? '120 50 472 590' : '130 55 452 490';
  return `<svg class="${className}" viewBox="${vb}" role="img" aria-label="${title}" xmlns="http://www.w3.org/2000/svg">
  <path d="${LOGO_MARK_PATH}" fill="currentColor"/>
  <text x="231" y="248" textLength="246" lengthAdjust="spacing" fill="#fff" font-family="Montserrat, sans-serif" font-weight="500" font-size="78">RENT</text>
  ${withWordmark ? `<text x="146" y="621" textLength="421" lengthAdjust="spacing" fill="currentColor" font-family="Montserrat, sans-serif" font-weight="400" font-size="58">HERNING</text>` : ''}
</svg>`;
}
