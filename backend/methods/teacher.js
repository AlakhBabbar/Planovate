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
            return { success: false, message: "Teacher already exists with this ID." };
        }

        // Save the teacher
        const newTeacher = new Teacher({ unid, ID, name, faculty, department });
        await newTeacher.save();
        return { success: true, message: "Teacher saved successfully." };
    } catch (err) {
        return { success: false, message: `Error creating teacher: ${err.message}` };
    }
};


export const getTeachers = async (req, res) => {
    try {
        const { faculty, department } = req.query;

        if (!faculty && !department) {
            const teachers = await Teacher.distinct("ID");
            return teachers;
        }
        
        if (!faculty) {
            const teachers = await Teacher.distinct("ID", { department });
            return teachers;
        }

        if (!department) {
            const teachers = await Teacher.distinct("ID", { faculty });
            return teachers;
        }
        const teachers = await Teacher.distinct("ID", { faculty, department });
        return teachers;
    } catch (error) {
        throw new Error(`Error fetching teachers: ${error.message}`);
    }
};

export const fetchTeachers = async (req, res) => {
    try {
        const { faculty, department } = req.query;

        let query = {};
        if (faculty) query.faculty = faculty;
        if (department) query.department = department;

        // Fetch teachers with unid, id, and name
        const teachers = await Teacher.find(query, { _id: 0, unid: 1, ID: 1, name: 1 });

        return teachers; // Returns [{ unid: "123456", id: "T001", name: "John Doe" }]
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


export const deleteTeacher = async (json) => {
    try {
        const { unid } = json;

        if (!unid) {
            return { success: false, message: "Teacher ID (ID) is required" };
        }

        // Debugging: Find the teacher before deleting
        const teacher = await Teacher.findOne({ unid });
        console.log({unid});
        console.log("Found Teacher:", teacher);

        if (!teacher) {
            return { success: false, message: "Teacher not found" };
        }

        // Delete the teacher
        const result = await Teacher.deleteOne({ unid});
        console.log("Delete Result:", result);

        if (result.deletedCount === 0) {
            return { success: false, message: "Teacher was not deleted" };
        }

        return { success: true, message: "Teacher deleted successfully" };
    } catch (error) {
        console.error("Error deleting teacher:", error);
        throw new Error(`Error deleting teacher: ${error.message}`);
    }
};



export const getFaculty = async (req, res) => {
    try {
        const faculties = await Teacher.distinct("faculty");
        return faculties;
    } catch (error) {
        throw new Error(`Error fetching faculties: ${error.message}`);
    }
};

export const getDepartment = async (req,res) => {
    try {
        const { faculty } = req.query;

        if (!faculty) {
            const departments = await Teacher.distinct("department");
            return departments;
        }
        const departments = await Teacher.distinct("department", {faculty});
        return departments;

    }catch (error) {
        throw new Error(`Error fetching departments: ${error.message}`);
    }
};
