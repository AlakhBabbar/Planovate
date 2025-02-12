import room from "../models/RoomSchema.js";

const createRoom = async (json) => {
    try {
        const {unid, name, ID, capacity, faculty, availability} = json;

        // Check if the room already exists
        const result = await room.findOne({ID});
        if (result) {
            return {createRoom:false, error: "Room already exists with this ID" };
        }

        // Save the room
        const newRoom = new room({
            unid,
            name,
            ID,
            capacity,
            faculty,
            availability,
        });

        await newRoom.save();
        return {createRoom:true, message: "Room saved" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

const deleteRoom = async (json) => {
    try {
        const { ID } = json;

        // Check if the room exists
        const result = await room.findOne({ID});
        if (!result) {
            return {deleteRoom: false, error: "Room does not exist with this ID" };
        }

        // Delete the room
        await room.deleteOne({ID});
        return {deleteRoom:true, message: "Room deleted" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

const updateRoom = async (json) => {
    try {
        console.log(json);
        const { unid, name, ID, capacity, faculty, availability } = json;

        // Create the update object
        const data = { name, ID, capacity, faculty, availability };
        console.log(data);
        // Find the room by unid
        const Room = await room.findOne({ unid });

        if (Room) {
            // Update the room's details
            const updatedRoom = await room.updateOne({ unid }, { $set: data });

            // Check if the update was successful
            if (updatedRoom.modifiedCount > 0) {
                return { success: true, message: "Room updated successfully", room: updatedRoom };
            } else {
                return { success: false, message: "No changes made to room data" };
            }
        }

        return { success: false, message: "Room not found" };
    } catch (error) {
        throw new Error(`Error updating room: ${error.message}`);
    }
};

const getRoom = async (req) => {
    try {
        const {day, time} = req.query;

        const rooms = await room.distinct("ID", { [`availability.day.${day}.time`]: { $elemMatch: { time, available: true } } });
        return { success:true, rooms };
    }
    catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

export { createRoom, deleteRoom, updateRoom, getRoom };