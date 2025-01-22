import teachOcc from "../models/TeachOcc.js";

// Checking teacher occupation and updating if necessary
const clashTeacher = async (json) => {
    try {
        const { teacher, class: classs, branch, day, time, batch, action } = json;

        // Create the query object
        const query = { class: classs, branch, day, time };
        if (batch) {
            query.batch = batch;
        }
        const result = await teachOcc.findOne(query);
        if (result) {
        // Update the teacher's occupation
        await teachOcc.updateOne(query, { teacher });
        return { clash: false, message: "Teacher record updated successfully" };
        
        } else {
            // Check if the teacher is already occupied
            const result = await teachOcc.findOne({ teacher, day, time });
            if (result) {
                return { clash: true, details: "Teacher already occupied" };
            }

            // Save the teacher's occupation
            const tocc = new teachOcc({
                teacher,
                class: classs,
                branch,
                day,
                time,
                batch,
            });

            await tocc.save();
            return { clash: false, details: "Teacher not occupied and saved" };
        }
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

export { clashTeacher };