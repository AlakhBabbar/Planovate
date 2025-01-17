import mongoose from "mongoose";
// import Timetable1 from "./models/Timetable1.js";
// import Timetable2 from "./models/Timetable2.js";
// import Timetable3 from "./models/Timetable3.js";
// import Timetable4 from "./models/Timetable4.js";
import Room from "../models/RoomSchema.js";
import Teacher from "../models/TeacherSchema.js";
import TeachOcc from "../models/TeachOcc.js";
import RoomOcc from "../models/RoomOcc.js";
import Timetable from "../models/Timetable.js";




//connecting to mongodb
mongoose
    .connect("mongodb://127.0.0.1:27017/LogicDB")
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB:", err.message);
        process.exit(1); // Exit the process on error
    });

    
//checking teacher occupation
const clash = async (json) => {
    try {
        const { teacher, class: classs, branch, day, time } = json;

        // Check if the teacher is already occupied
        const result = await TeachOcc.findOne({ teacher, day, time });
        if (result) {
            return { clash: true, details: "Teacher already occupied" };
        }

        // Save the teacher's occupation
        const tocc = new TeachOcc({
            teacher,
            class: classs,
            branch,
            day,
            time,
        });

        await tocc.save();
        return { clash: false, details: "Teacher not occupied and saved" };
    } catch (err) {
        throw new Error(`Error: ${err.message}`);
    }
};

export {clash};
