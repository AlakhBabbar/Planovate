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
        const { unid } = json;

        console.log(unid);

        // Check if the room exists
        const result = await room.findOne({unid});
        if (!result) {
            return {deleteRoom: false, message: "Room does not exist with this ID" };
        }

        // Delete the room
        await room.deleteOne({unid});
        return {deleteRoom:true, message: "Room deleted" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

const updateRoom = async (json) => {
    try {
        console.log(json);
        const { unid, name, ID, capacity, faculty, availability } = json;
        // const unid = Number(json.unid);  // ✅ Ensure unid is a number

        // Create the update object
        const data = { name, capacity, faculty, availability };
        console.log(data);

        // Find and update the room
        const updatedRoom = await room.findOneAndUpdate(
            { ID },
            { $set: data },
            { new: true } // ✅ Returns updated document
        );

        if (updatedRoom) {
            return { success: true, message: "Room updated successfully", room: updatedRoom };
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

const fetchRooms = async (faculty) => {   // ✅ Accept faculty directly
    try {
        if (!faculty) {
            throw new Error("Faculty parameter is missing");
        }

        const rooms = await room.find({ faculty });
        return { success: true, rooms };
    } catch (error) {
        throw new Error(`Error fetching rooms: ${error.message}`);
    }
};


const fetchFaculty = async (req) => {
    try {
        const faculties = await room.distinct("faculty");
        return { success: true, faculties };
    } catch (error) {
        throw new Error(`Error fetching faculties: ${error.message}`);
    }
}

export { createRoom, deleteRoom, updateRoom, getRoom, fetchRooms, fetchFaculty };