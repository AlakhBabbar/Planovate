/**
 * Data normalization and formatting utilities
 */

export const DEFAULT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Normalizes a value by trimming and collapsing whitespace
 */
export const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

/**
 * Creates a safe ID from a value for use in Firestore document IDs
 */
export const safeId = (value) =>
  normalize(value)
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 180);

/**
 * Generates a cell key from row and column indices
 */
export const cellKey = (rowIndex, colIndex) => `${rowIndex}-${colIndex}`;

/**
 * Generates a data key from row, column, and batch indices
 */
export const dataKey = (rowIndex, colIndex, batchIndex) =>
  `${rowIndex}-${colIndex}-${batchIndex}`;
