import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { roomService } from "../firebase/services";

const RoomLoad = () => {
  const [faculties, setFaculties] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [newFaculty, setNewFaculty] = useState("");
  const [rooms, setRooms] = useState([]);
  const [isAddingFaculty, setIsAddingFaculty] = useState(false);
  const [isFacultyEntered, setIsFacultyEntered] = useState(false);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);


  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    try {
      const data = await roomService.listFaculties();
      setFaculties(data);
    } catch (error) {
      console.error("Error fetching faculties:", error);
    }
  };
  

  const fetchRooms = async (faculty) => {
    try {
    const data = await roomService.listRooms({ faculty });
    setRooms(data.map((room) => ({ ...room, isAdded: true })));
    } catch (error) {
        console.error("Error fetching rooms:", error);
    }
};



  const addFaculty = async () => {
    if (!newFaculty.trim()) {
      return alert("Faculty name cannot be empty!");
    }
    if (rooms.length === 0) {
      return alert("At least one room must be added before saving the faculty!");
    }
    try {
      // Faculties are derived from rooms in Firestore; we keep the UX by adding
      // it locally and persisting once at least one room is saved under it.
      if (!faculties.includes(newFaculty)) {
        setFaculties([...faculties, newFaculty]);
      }
      setSelectedFaculty(newFaculty);
      setNewFaculty("");
      setIsAddingFaculty(false);
      setIsFacultyEntered(true);
    } catch (error) {
      console.error("Error adding faculty:", error);
    }
  };

  const handleEnterFaculty = (e) => {
    if (e.key === "Enter") {
      if (!newFaculty.trim()) {
        return alert("Faculty name cannot be empty!");
      }
  
      setSelectedFaculty(newFaculty);
      setIsAddingFaculty(false);
      setIsFacultyEntered(true);
      setFaculties([...faculties, newFaculty]); // Add faculty to dropdown
      setNewFaculty("");
  
      // ✅ Instead of saving, allow user to add a row
      addRoomRow();
    }
  };
  

  const toggleAvailability = (index, day, time) => {
    const updatedRooms = [...rooms];
  
    // ✅ Ensure `availability.day[day].time` exists
    if (!updatedRooms[index].availability.day[day]) {
      updatedRooms[index].availability.day[day] = { time: [] };
    }
  
    const dayAvailability = updatedRooms[index].availability.day[day].time;
  
    // ✅ Toggle the checkbox state
    if (dayAvailability.some(slot => slot.time === time)) {
      updatedRooms[index].availability.day[day].time = dayAvailability.filter(slot => slot.time !== time);
    } else {
      updatedRooms[index].availability.day[day].time.push({ time, available: true });
    }
  
    setRooms(updatedRooms);
  };
  
  

  const addRoomRow = () => {
    setRooms([
      ...rooms,
      {
        unid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ID: "",
        name: "",
        capacity: "",
        isAdded: false,
        availability: {
          day: {
            mon: { time: [] },
            tue: { time: [] },
            wed: { time: [] },
            thu: { time: [] },
            fri: { time: [] },
            sat: { time: [] },
          },
        },
      },
    ]);
  };
  
  

  const updateRoomField = (index, field, value) => {
    const updatedRooms = [...rooms];
    updatedRooms[index][field] = field === "capacity" ? parseInt(value, 10) || "" : value;

    setRooms(updatedRooms);
  };

  const addRoom = async (index) => {
    const room = rooms[index];
  
    // ✅ Validation: Ensure Room ID, Name, and Capacity are filled
    if (!room.ID.trim() || !room.name.trim() || room.capacity === "" || isNaN(room.capacity)) {
        return alert("All fields (Room ID, Name, Capacity) must be filled!");
      }
      
  
    try {
      const unid = await roomService.upsertRoom({
        unid: room.unid,
        ID: room.ID,
        name: room.name,
        capacity: parseInt(room.capacity, 10),
        faculty: selectedFaculty,
        availability: room.availability,
      });

      const updatedRooms = [...rooms];
      updatedRooms[index].isAdded = true;
      updatedRooms[index].unid = unid;
      setRooms(updatedRooms);

      await fetchRooms(selectedFaculty);

      if (isAddingFaculty) {
        addFaculty();
      }
    } catch (error) {
      console.error("Error saving room:", error);
    }
  };

  const updateRoom = async (index) => {
    const room = rooms[index];
    console.log("Updating Room with unid:", room.unid);  // ✅ Debug log

    // ✅ Validation: Ensure all fields are filled
    if (!room.ID.trim() || !room.name.trim() || room.capacity === "" || isNaN(room.capacity)) {
        return alert("All fields (Room ID, Name, Capacity) must be filled!");
    }
    
    try {
      await roomService.upsertRoom({
        unid: room.unid,
        ID: room.ID,
        name: room.name,
        capacity: room.capacity,
        faculty: selectedFaculty,
        availability: room.availability,
      });

            alert("Room updated successfully!");
            fetchRooms(selectedFaculty);  // ✅ Refresh the room list
    } catch (error) {
        console.error("Error updating room:", error);
    }
};

const deleteRoom = async (index) => {
    const room = rooms[index];

    try {
    await roomService.deleteRoom(room.unid);
    alert("Room deleted successfully!");
    const updatedRooms = rooms.filter((_, i) => i !== index);
    setRooms(updatedRooms);
    } catch (error) {
        console.error("Error deleting room:", error);
    }
};

  
  

  return (
    <Layout
      leftSection={
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Select or Add Faculty</h2>

          {!isAddingFaculty ? (
            <div className="flex items-center gap-2">
              <select
                className="p-2 border rounded w-full"
                value={selectedFaculty}
                onChange={(e) => {
                  setSelectedFaculty(e.target.value);
                  setIsFacultyEntered(true);
                  fetchRooms(e.target.value);
                }}
              >
                <option value="" disabled>Select Faculty</option>
                {faculties.map((faculty, index) => (
                  <option key={index} value={faculty}>{faculty}</option>
                ))}
              </select>

              <button
                onClick={() => setIsAddingFaculty(true)}
                className="p-2 bg-blue-500 text-white rounded"
              >
                +
              </button>
            </div>
          ) : (
            <input
              type="text"
              className="p-2 border rounded w-full"
              placeholder="Enter new faculty"
              value={newFaculty}
              onChange={(e) => setNewFaculty(e.target.value)}
              onKeyDown={handleEnterFaculty}
            />
          )}
        </div>
      }
      rightSection={
        <div>
          <h2 className="text-2xl font-bold mb-4">Room Details</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 p-2">Room ID</th>
                <th className="border border-gray-300 p-2">Room Name</th>
                <th className="border border-gray-300 p-2">Capacity</th>
                <th className="border border-gray-300 p-2">Availability</th>
                <th className="border border-gray-300 p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room, index) => (
                <tr key={room.unid} className="border border-gray-300">
                  <td className="p-2">
                    <input
                      type="text"
                      className="p-2 border rounded w-full"
                      value={room.ID || ""}
                      onChange={(e) => updateRoomField(index, "ID", e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="p-2 border rounded w-full"
                      value={room.name || ""}
                      onChange={(e) => updateRoomField(index, "name", e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                  <input
  type="number"
  value={room.capacity}
  onChange={(e) => updateRoomField(index, "capacity", parseInt(e.target.value, 10) || "")}
  className="border p-1 rounded w-full"
/>

                  </td>
                  {/* ✅ Availability Column (Button + Pop-up Table) */}
      <td className="p-2 border relative">
        <button
          className="p-2 bg-gray-500 text-white rounded w-full"
          onClick={() => setSelectedRoomIndex(index)}
        >
          Select Availability
        </button>

        {/* ✅ Pop-up Table for Availability Selection */}
{selectedRoomIndex === index && (
  <div
    className="absolute top-10 left-0 bg-white shadow-lg p-3 border rounded z-50"
    style={{
        top: "100%",       // ✅ Position below button
        left: "50%",       // ✅ Center horizontally
        transform: "translateX(-50%)",  // ✅ Perfect centering  
      maxHeight: "300px",  // ✅ Limit height
      maxWidth: "500px",   // ✅ Limit width
      overflowX: "auto",   // ✅ Horizontal Scroll
      overflowY: "auto",   // ✅ Vertical Scroll
      whiteSpace: "nowrap" // ✅ Prevent wrapping of weekdays
    }}
  >
    <table className="w-full border-collapse border">
      <thead>
        <tr>
          <th className="border p-1">Time</th>
          {["mon", "tue", "wed", "thu", "fri", "sat"].map(day => (
            <th key={day} className="border p-1">{day.toUpperCase()}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[
          "7:00-7:55", "8:00-8:55", "9:00-9:55", "10:00-10:55",
          "11:00-11:55", "12:00-12:55", "1:00-1:55", "2:00-2:55",
          "3:00-3:55", "4:00-5:00"
        ].map(time => (
          <tr key={time}>
            <td className="border p-1">{time}</td>
            {["mon", "tue", "wed", "thu", "fri", "sat"].map(day => (
              <td key={day} className="border p-1">
                <input
                  type="checkbox"
                  checked={room.availability.day[day]?.time.some(slot => slot.time === time)}
                  onChange={() => toggleAvailability(index, day, time)}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>

    {/* Close Button */}
    <button
      className="mt-2 p-1 bg-red-500 text-white rounded w-full text-sm"
      onClick={() => setSelectedRoomIndex(null)}
    >
      Close
    </button>
  </div>
)}

      </td>

                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => room.isAdded ? updateRoom(index) : addRoom(index)}
                      className={`p-2 rounded ${room.isAdded ? "bg-blue-500" : "bg-green-500"} text-white`}
                    >
                      {room.isAdded ? "UPDATE" : "ADD"}
                    </button>
                    <button
                      onClick={() => deleteRoom(index)}
                      className="p-2 bg-red-500 text-white rounded"
                    >
                      DELETE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={addRoomRow}
            disabled={!selectedFaculty}
            className="mt-4 p-2 bg-gray-800 text-white rounded"
          >
            Add Row
          </button>
        </div>
      }
    />
  );
};

export default RoomLoad;
