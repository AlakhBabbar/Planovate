/**
 * Conflict checking utilities for Planovate.
 *
 * A conflict occurs when the same teacher OR the same room is used in more than
 * one place for the same (day, time) cell (i.e., same colIndex + rowIndex).
 *
 * Current UI data model (single-table):
 * - batches:   { "row-col": number }
 * - batchData: { "row-col-batchIndex": { teacher, room, course, batchName } }
 *
 * Future multi-table model supported:
 * - batchesByTable:   { [tableId]: batches }
 * - batchDataByTable: { [tableId]: batchData }
 */

const normalize = (value) =>
	String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");

const cellKey = (rowIndex, colIndex) => `${rowIndex}-${colIndex}`;
const dataKey = (rowIndex, colIndex, batchIndex) =>
	`${rowIndex}-${colIndex}-${batchIndex}`;

function resolveTables({
	tableId,
	tableIds,
	batches,
	batchData,
	batchesByTable,
	batchDataByTable,
}) {
	// Preferred: explicit per-table data.
	if (batchesByTable && batchDataByTable) {
		const ids =
			tableIds && tableIds.length
				? tableIds
				: Object.keys(batchesByTable);

		return {
			tableId: tableId ?? ids[0] ?? "Table 1",
			tableIds: ids,
			batchesByTable,
			batchDataByTable,
		};
	}

	// Fallback: single-table data (current implementation).
	const singleId = tableId ?? "Table 1";
	return {
		tableId: singleId,
		tableIds: [singleId],
		batchesByTable: { [singleId]: batches ?? {} },
		batchDataByTable: { [singleId]: batchData ?? {} },
	};
}

function getBatchCountForCell(batchesForTable, rowIndex, colIndex) {
	// Current model: batchesForTable["row-col"] -> count
	const key = cellKey(rowIndex, colIndex);
	const count = batchesForTable?.[key];
	if (typeof count === "number" && Number.isFinite(count) && count > 0) {
		return count;
	}

	// Back-compat: nested arrays/objects e.g., batches[row][col] = [...] (older).
	const legacy = batchesForTable?.[rowIndex]?.[colIndex];
	if (Array.isArray(legacy)) return Math.max(legacy.length, 1);
	if (legacy && typeof legacy === "object" && Array.isArray(legacy.batches)) {
		return Math.max(legacy.batches.length, 1);
	}

	// Default UI always shows 1 block.
	return 1;
}

function readCellAssignments({
	batchesForTable,
	batchDataForTable,
	rowIndex,
	colIndex,
}) {
	const count = getBatchCountForCell(batchesForTable, rowIndex, colIndex);
	const result = [];

	for (let batchIndex = 0; batchIndex < count; batchIndex += 1) {
		const entry = batchDataForTable?.[dataKey(rowIndex, colIndex, batchIndex)] ??
			{};
		result.push({
			batchIndex,
			teacher: entry.teacher ?? "",
			room: entry.room ?? "",
		});
	}
	return result;
}

/**
 * Check teacher/room conflicts for a given cell edit.
 *
 * You call this on every teacher/room change.
 *
 * @param {object} params
 * @param {number} params.rowIndex
 * @param {number} params.colIndex
 * @param {number} [params.batchIndex=0]
 *
 * Data (either single-table OR multi-table):
 * @param {object} [params.batches]
 * @param {object} [params.batchData]
 * @param {object} [params.batchesByTable]
 * @param {object} [params.batchDataByTable]
 * @param {string} [params.tableId] Current table id/name
 * @param {string[]} [params.tableIds] All table ids/names
 *
 * The value being edited:
 * @param {"teacher"|"room"} params.field
 * @param {string} params.nextValue
 *
 * @returns {{
 *  teacher: { conflict: boolean, matches: Array<object> },
 *  room: { conflict: boolean, matches: Array<object> }
 * }}
 */
export function checkConflicts(params) {
	const {
		rowIndex,
		colIndex,
		batchIndex = 0,
		field,
		nextValue,
	} = params;

	const {
		tableId,
		tableIds,
		batchesByTable,
		batchDataByTable,
	} = resolveTables(params);

	const allEntries = [];

	for (const tId of tableIds) {
		const batchesForTable = batchesByTable[tId] ?? {};
		const dataForTable = batchDataByTable[tId] ?? {};
		const assignments = readCellAssignments({
			batchesForTable,
			batchDataForTable: dataForTable,
			rowIndex,
			colIndex,
		});

		for (const a of assignments) {
			// Apply the candidate edit to the target position only.
			const isTarget =
				tId === tableId &&
				a.batchIndex === batchIndex;

			const teacher =
				isTarget && field === "teacher" ? nextValue : a.teacher;
			const room = isTarget && field === "room" ? nextValue : a.room;

			allEntries.push({
				tableId: tId,
				rowIndex,
				colIndex,
				batchIndex: a.batchIndex,
				teacher,
				room,
				isTarget,
			});
		}
	}

	const teacherNeedle = normalize(
		field === "teacher" ? nextValue : (allEntries.find((e) => e.isTarget)?.teacher ?? "")
	);
	const roomNeedle = normalize(
		field === "room" ? nextValue : (allEntries.find((e) => e.isTarget)?.room ?? "")
	);

	const teacherMatches = teacherNeedle
		? allEntries.filter((e) => normalize(e.teacher) === teacherNeedle)
		: [];
	const roomMatches = roomNeedle
		? allEntries.filter((e) => normalize(e.room) === roomNeedle)
		: [];

	// A single occurrence is fine; conflicts start at 2+.
	return {
		teacher: {
			conflict: teacherMatches.length > 1,
			matches: teacherMatches.map(({ isTarget: _isTarget, ...rest }) => rest),
		},
		room: {
			conflict: roomMatches.length > 1,
			matches: roomMatches.map(({ isTarget: _isTarget, ...rest }) => rest),
		},
	};
}

/** Convenience wrappers */
export function checkTeacherConflict(params) {
	return checkConflicts({ ...params, field: "teacher", nextValue: params.nextValue });
}

export function checkRoomConflict(params) {
	return checkConflicts({ ...params, field: "room", nextValue: params.nextValue });
}

