import mongoose from "mongoose";
// import Timetable1 from "./models/Timetable1.js";
// import Timetable2 from "./models/Timetable2.js";
// import Timetable3 from "./models/Timetable3.js";
// import Timetable4 from "./models/Timetable4.js";
import Room from "./models/RoomSchema.js";
import Teacher from "./models/TeacherSchema.js";
import TeachOcc from "./models/TeachOcc.js";
import RoomOcc from "./models/RoomOcc.js";
import Timetable from "./models/Timetable.js";




//connecting to mongodb
mongoose
    .connect("monogo db url")
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB:", err.message);
    });

// const tt1 = new Timetable1({
//     day: "Monday",
//     time: "8:00AM-9:00PM",
//     course: "CA",
//     room: "A1",
//     teacher: "A",
// });

// tt1.save().then(() => {
//     console.log("Timetable1 saved");
// }).catch((err) => {
//     console.log("Error saving Timetable1:", err.message);
// });


// const tt2 = new Timetable2({
//     day: "Tuesday",
//     time: "8:00AM-9:00PM",
//     course: "DA",
//     room: "B1",
//     teacher: "b",
// });

// tt2.save().then(() => {
//     console.log("Timetable2 saved");
// }).catch((err) => {
//     console.log("Error saving Timetable2:", err.message);
// });



// const tt3 = new Timetable3({
//     day: "Monday",
//     time: "7:00AM-8:00PM",
//     course: "AA",
//     room: "A1",
//     teacher: "C",
// });

// tt3.save().then(() => {
//     console.log("Timetable3 saved");
// }).catch((err) => {
//     console.log("Error saving Timetable3:", err.message);
// });



// const tt4 = new Timetable4({
//     day: "Monday",
//     time: "10:00AM-11:00PM",
//     course: "ZZ",
//     room: "C1",
//     teacher: "X",
// });

// tt4.save().then(() => {
//     console.log("Timetable4 saved");
// }).catch((err) => {
//     console.log("Error saving Timetable4:", err.message);
// });


//example values for teach occ table testing
let a = "alakh";
let b = "1st year";
let c = "Electrical";
let d = "A";
let e = "Tuesday";
let f = "8:00AM-9:00PM";
let g = "CA";
let h = "R7";

//checking teacher occupation
const p = new Promise((resolve, reject)=>{
    TeachOcc.findOne({teacher: a, day: e, time: f}).then((result) => {
        if(result){
            reject("Teacher already occupied");
        }else{
            resolve("Teacher not occupied");
        }
    }).catch((err) => {
        reject(err.message);
    });
});

//performing saving operation in teacher occupation table
p.then((message) => {
    console.log(message);
    const tocc = new TeachOcc({
        teacher: a,
        class: b,
        branch: c,
        batch: d,
        day: e,
        time: f,
        course: g,
        room: h,
    });
    tocc.save().then(() => {
        console.log("Teacher occupation updated");
    }).catch((err) => {
        console.log("Error saving Teacher occupied:", err.message);
    });
}).catch((message) => {
    console.log(message);
});
