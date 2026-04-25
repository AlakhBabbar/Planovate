/**
 * Suggestion Builder
 *
 * Extracts neighbor-cell suggestions from the full suggestion grid
 * based on the user's current cursor position.
 *
 * Neighbor cells (for cursor at row R, col C):
 *   up    → (R-1, C)
 *   down  → (R+1, C)
 *   left  → (R, C-1)
 *   right → (R, C+1)
 */

/**
 * Get suggestions for neighbor cells around a cursor position.
 *
 * @param {Map<string, Array>} suggestionGrid - full grid from computeEngine
 * @param {number} row - current cursor row
 * @param {number} col - current cursor column
 * @param {number} maxRows - total number of time slots (rows)
 * @param {number} maxCols - total number of days (columns)
 * @returns {Object} { up, down, left, right } — each is { row, col, direction, suggestions[] } or null
 */
export function getNeighborSuggestions(suggestionGrid, row, col, maxRows, maxCols) {
  const neighbors = {};

  const directions = [
    { name: "up",    dr: -1, dc:  0 },
    { name: "down",  dr:  1, dc:  0 },
    { name: "left",  dr:  0, dc: -1 },
    { name: "right", dr:  0, dc:  1 },
  ];

  for (const { name, dr, dc } of directions) {
    const nr = row + dr;
    const nc = col + dc;

    // Bounds check
    if (nr < 0 || nr >= maxRows || nc < 0 || nc >= maxCols) {
      neighbors[name] = null;
      continue;
    }

    const key = `${nr}-${nc}`;
    const suggestions = suggestionGrid.get(key) || [];

    neighbors[name] = {
      row: nr,
      col: nc,
      direction: name,
      suggestions,
    };
  }

  return neighbors;
}
