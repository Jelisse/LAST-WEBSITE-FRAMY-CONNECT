export const portraitShapes = ['framy', 'circle', 'square'] as const;
export const portraitPatterns = ['solid', 'waves', 'maze', 'hatch', 'rings', 'halftone', 'rays', 'zigzag', 'leaves', 'ribbons', 'diamonds', 'sprinkles', 'dots', 'diagonal', 'petals', 'split'] as const;
export type PortraitShape = typeof portraitShapes[number];
export type PortraitPattern = typeof portraitPatterns[number];
export function portraitPath(shape: PortraitShape = 'framy') {
  if (shape === 'circle') return 'M390 240A180 180 0 1 1 30 240A180 180 0 1 1 390 240Z';
  if (shape === 'square') return 'M60 60H360Q390 60 390 90V390Q390 420 360 420H60Q30 420 30 390V90Q30 60 60 60Z';
  return 'M28 400L42 125Q45 66 108 66H338Q404 66 387 130C380 260 270 414 126 414H48Q25 414 28 400Z';
}
export function portraitMask(shape: PortraitShape = 'framy', escape = false) {
  // Extend only the top: shoulders remain clipped to the selected frame.
  const top = escape ? '<path fill="white" d="M0 0H420V180H0Z"/>' : '';
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 440"><path fill="white" d="${portraitPath(shape)}"/>${top}</svg>`)}")`;
}
