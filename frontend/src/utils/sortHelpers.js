/**
 * Sort comparator: semester ascending (numeric), then alphabetical by class/branch.
 * Works for timetables, curriculums, or any object with semester + class/branch fields.
 */
export function semesterThenAlpha(a, b) {
  const semA = parseInt(a.semester, 10) || 999;
  const semB = parseInt(b.semester, 10) || 999;
  if (semA !== semB) return semA - semB;

  const classA = (a.class || a.className || '').toLowerCase();
  const classB = (b.class || b.className || '').toLowerCase();
  if (classA !== classB) return classA.localeCompare(classB);

  const branchA = (a.branch || '').toLowerCase();
  const branchB = (b.branch || '').toLowerCase();
  return branchA.localeCompare(branchB);
}
