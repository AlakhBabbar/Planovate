import Teacher from "../models/TeacherSchema.js";

export const createTeacher = async (json) => {
    try {
        const { unid, ID, name, faculty, department } = json;

        // Check if all required fields are provided
        if (!ID || !name || !faculty || !department) {
            return { success: false, error: "All fields (ID, name, faculty, department) are required." };
        }

        // Check if the teacher already exists
        const result = await Teacher.findOne({ ID });
        if (result) {
            return { success: false, error: "Teacher already exists with this ID." };
        }

        // Save the teacher
        const newTeacher = new Teacher({ unid, ID, name, faculty, department });
        await newTeacher.save();
        return { success: true, message: "Teacher saved successfully." };
    } catch (err) {
        return { success: false, error: `Error creating teacher: ${err.message}` };
    }
};


export const getTeachers = async () => {
    try {
        const teachers = await Teacher.find();
        return teachers;
    } catch (error) {
        throw new Error(`Error fetching teachers: ${error.message}`);
    }
};

export const updateTeacher = async (json) => {
    try {
        console.log(json);
        const { unid, ID, name, faculty, department } = json;

        // Create the update object
        const data = { ID, name, faculty, department };
        console.log(data);
        // Find the teacher by unid
        const teacher = await Teacher.findOne({ unid });

        if (teacher) {
            // Update the teacher's details
            const updatedTeacher = await Teacher.updateOne({ unid }, { $set: data });

            // Check if the update was successful
            if (updatedTeacher.modifiedCount > 0) {
                return { success: true, message: "Teacher updated successfully", teacher: updatedTeacher };
            } else {
                return { success: false, message: "No changes made to teacher data" };
            }
        }

        return { success: false, message: "Teacher not found" };
    } catch (error) {
        throw new Error(`Error updating teacher: ${error.message}`);
    }
};


export const deleteTeacher = async (ID) => {
    try {
        const result = await Teacher.findOneAndDelete({ ID });
        if (!result) {
            return { success: false, message: "Teacher not found" };
        }
        return { success: true, message: "Teacher deleted successfully" };
    } catch (error) {
        throw new Error(`Error deleting teacher: ${error.message}`);
    }
};
