import room from "../models/RoomSchema.js";

const createRoom = async (json) => {
    try {
        const {name, ID, capacity, faculty} = json;

        // Check if the room already exists
        const result = await room.findOne({ID});
        if (result) {
            return {createRoom:false, error: "Room already exists with this ID" };
        }

        // Save the room
        const newRoom = new room({
            name,
            ID,
            capacity,
            faculty,
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
        const { ID, name, capacity, faculty } = json;

        // Check if the room exists
        const result = await room.findOne({ID});
        if (!result) {
            return {updateRoom: false, error: "Room does not exist with this ID" };
        }

        // Update the room
        await room.updateOne({ID}, { name, capacity, faculty });
        return {updateRoom:true, message: "Room updated" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

export { createRoom, deleteRoom, updateRoom };