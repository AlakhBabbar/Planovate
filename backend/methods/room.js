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

export { createRoom };