import room from "../models/RoomSchema.js";

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

export { deleteRoom };