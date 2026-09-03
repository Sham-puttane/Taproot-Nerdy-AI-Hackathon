/**
 * One hue per grade, used everywhere.
 *
 * Colour here carries information rather than decoration: the same hue means
 * the same grade on a root, on a keystone chip and on a badge, so a child
 * starts reading depth by colour without anyone explaining it. Purple is
 * deepest, warm is nearest the surface.
 */
export function gradeVar(grade: string | undefined): string {
  const g = (grade ?? '').toUpperCase()
  return ['K', '1', '2', '3', '4', '5'].includes(g)
    ? `var(--g-${g})`
    : 'var(--glow)'
}
