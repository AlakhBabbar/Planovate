/**
 * Role-based route access configuration.
 * Maps each route path to the roles allowed to access it.
 * 'admin' always has access to everything (handled in ProtectedRoute).
 */

export const ROLE_ACCESS = {
  // Home — everyone
  '/':                  ['admin', 'hod', 'teacher', 'tt_incharge', 'student'],

  // Occupancy — everyone
  '/teacher-occupancy': ['admin', 'hod', 'teacher', 'tt_incharge', 'student'],
  '/class-occupancy':   ['admin', 'hod', 'teacher', 'tt_incharge', 'student'],
  '/room-occupancy':    ['admin', 'hod', 'teacher', 'tt_incharge', 'student'],

  // Load pages — admin, hod, tt_incharge
  '/teacher-load':      ['admin', 'hod', 'tt_incharge'],
  '/course-load':       ['admin', 'hod', 'tt_incharge'],
  '/room-load':         ['admin', 'hod', 'tt_incharge'],

  // Curriculum — admin, hod, tt_incharge
  '/curriculum':        ['admin', 'hod', 'tt_incharge'],

  // Timetable — admin, tt_incharge
  '/timetable':         ['admin', 'tt_incharge'],

  // Manage / Admin pages — admin only
  '/manage':            ['admin'],
  '/admin-settings':    ['admin'],
  '/bulk-upload':       ['admin'],
  '/user-management':   ['admin'],
};

/**
 * Check if a role can access a given path.
 */
export function canAccess(role, path) {
  // Admin always has access
  if (role === 'admin') return true;

  // Handle dynamic routes like /timetable/:id
  const normalizedPath = path.replace(/\/timetable\/.*/, '/timetable');

  const allowedRoles = ROLE_ACCESS[normalizedPath];
  if (!allowedRoles) return false; // unknown route → deny
  return allowedRoles.includes(role);
}

/**
 * Get all accessible nav items for a role.
 */
export function getNavItems(role) {
  return Object.entries(ROLE_ACCESS)
    .filter(([, roles]) => role === 'admin' || roles.includes(role))
    .map(([path]) => path);
}
