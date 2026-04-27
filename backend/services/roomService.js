/**
 * Room service — MongoDB
 */
import Room from '../models/Room.js';

export async function getAllRooms() {
  const docs = await Room.find({}).lean();
  return docs.map(d => ({ ...d, unid: d.unid ?? d._id?.toString() }));
}
