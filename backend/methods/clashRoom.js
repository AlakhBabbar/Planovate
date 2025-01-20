import roomOcc from "../models/RoomOcc.js";

// Checking room occupation and updating if necessary
const clashRoom = async (json) => {
    try {
        const { room, class: classs, branch, day, time, batch, action } = json;

        // Create the query object
        const query = { class: classs, branch, day, time };
        if (batch) {
            query.batch = batch;
        }
        const result = await roomOcc.findOne(query);
        if (result) {
        // Update the room's occupation
        await roomOcc.updateOne(query, { room });
        return { clash: false, message: "room record updated successfully" };
        
        } else {
            // Check if the room is already occupied
            const result = await roomOcc.findOne({ room, day, time });
            if (result) {
                return { clash: true, details: "room already occupied" };
            }

            // Save the room's occupation
            const tocc = new roomOcc({
                room,
                class: classs,
                branch,
                day,
                time,
                batch,
            });

            await tocc.save();
            return { clash: false, details: "room not occupied and saved" };
        }
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

export { clashRoom };