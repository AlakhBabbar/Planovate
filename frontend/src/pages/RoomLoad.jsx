import React, { useState, useEffect, useRef } from "react";
import { Building2, Plus, Trash2, Save, Search, Clock } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { roomService } from "../firebase/services";

const RoomLoad = () => {
  const [faculties, setFaculties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);

  const [selectedFaculty, setSelectedFaculty] = useState("");

  const [newFaculty, setNewFaculty] = useState("");

  const [isAddingFaculty, setIsAddingFaculty] = useState(false);

  const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    ID: "",
    name: "",
    capacity: "",
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
  });

  const roomIdRef = useRef(null);
  const roomNameRef = useRef(null);
  const roomCapacityRef = useRef(null);

  const handleRoomModalKeyDown = (e, currentField) => {
    const fields = [roomIdRef, roomNameRef, roomCapacityRef];
    const currentIndex = fields.findIndex(ref => ref.current === e.target);
    
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % fields.length;
      fields[nextIndex].current?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex === 0 ? fields.length - 1 : currentIndex - 1;
      fields[prevIndex].current?.focus();
    }
  };


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
      const updatedRooms = data.map((room) => ({
        ...room,
        isModified: false,
      }));
      setRooms(updatedRooms);
      setFilteredRooms(updatedRooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRooms(rooms);
    } else {
      const filtered = rooms.filter(
        (room) =>
          room.ID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          room.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRooms(filtered);
    }
  }, [searchQuery, rooms]);

  const saveRoom = async (index) => {
    const room = rooms[index];
    
    if (!selectedFaculty) {
      alert("Please select Faculty first!");
      return;
    }

    if (!room.ID?.trim() || !room.name?.trim()) {
      alert("Please fill in Room ID and Name!");
      return;
    }

    try {
      const unid = await roomService.upsertRoom({
        unid: room.unid,
        ID: room.ID,
        name: room.name,
        capacity: room.capacity,
        faculty: selectedFaculty,
        availability: room.availability,
      });

      const updatedRooms = [...rooms];
      updatedRooms[index].unid = unid;
      updatedRooms[index].isModified = false;
      setRooms(updatedRooms);
      
      setSuccessMessage("Room saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error saving room:", error);
      alert("Failed to save room.");
    }
  };

  const handleUpdateAll = async () => {
    if (!selectedFaculty) {
      alert("Please select Faculty first!");
      return;
    }

    const modifiedRooms = rooms.filter(r => r.isModified || !r.unid);
    
    if (modifiedRooms.length === 0) {
      alert("No changes to save!");
      return;
    }

    const invalidRooms = modifiedRooms.filter(r => !r.ID?.trim() || !r.name?.trim());
    if (invalidRooms.length > 0) {
      alert("Please fill in all Room ID and Name fields!");
      return;
    }

    if (!window.confirm(`Save ${modifiedRooms.length} room(s)?`)) {
      return;
    }

    try {
      setSaving(true);
      
      for (const room of modifiedRooms) {
        await roomService.upsertRoom({
          unid: room.unid,
          ID: room.ID,
          name: room.name,
          capacity: room.capacity,
          faculty: selectedFaculty,
          availability: room.availability,
        });
      }

      setSuccessMessage(`Successfully saved ${modifiedRooms.length} room(s)!`);
      setTimeout(() => setSuccessMessage(""), 3000);
      
      await fetchRooms(selectedFaculty);
    } catch (error) {
      console.error("Error updating rooms:", error);
      alert("Failed to save rooms. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRoom = async (index) => {
    const room = rooms[index];
  
    if (!room.unid) {
      const updatedRooms = rooms.filter((_, i) => i !== index);
      setRooms(updatedRooms);
      return;
    }

    if (!window.confirm("Delete this room?")) {
      return;
    }
  
    try {
      await roomService.deleteRoom(room.unid);
      const updatedRooms = rooms.filter((_, i) => i !== index);
      setRooms(updatedRooms);
      setSuccessMessage("Room deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error deleting room:", error);
      alert("Failed to delete room.");
    }
  };

  const openAddRoomModal = () => {
    setNewRoom({
      ID: "",
      name: "",
      capacity: "",
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
    });
    setIsAddRoomModalOpen(true);
  };

  const closeAddRoomModal = () => {
    setIsAddRoomModalOpen(false);
    setNewRoom({
      ID: "",
      name: "",
      capacity: "",
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
    });
  };

  const saveNewRoom = async (addMore = false) => {
    if (!selectedFaculty) {
      alert("Please select Faculty first!");
      return;
    }

    if (!newRoom.ID?.trim() || !newRoom.name?.trim()) {
      alert("Please fill in Room ID and Name!");
      return;
    }

    try {
      const unid = await roomService.upsertRoom({
        unid: null,
        ID: newRoom.ID,
        name: newRoom.name,
        capacity: newRoom.capacity,
        faculty: selectedFaculty,
        availability: newRoom.availability,
      });

      setSuccessMessage("Room added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      await fetchRooms(selectedFaculty);

      if (addMore) {
        setNewRoom({
          ID: "",
          name: "",
          capacity: "",
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
        });
      } else {
        closeAddRoomModal();
      }
    } catch (error) {
      console.error("Error adding room:", error);
      alert("Failed to add room.");
    }
  };

  const updateRoomField = (index, field, value) => {
    const updatedRooms = [...rooms];
    updatedRooms[index][field] = value;
    updatedRooms[index].isModified = true;
    setRooms(updatedRooms);
  };

  const toggleAvailability = (index, day, time) => {
    const updatedRooms = [...rooms];
    
    if (!updatedRooms[index].availability.day[day]) {
      updatedRooms[index].availability.day[day] = { time: [] };
    }
    
    const dayAvailability = updatedRooms[index].availability.day[day].time;
    
    if (dayAvailability.some(slot => slot.time === time)) {
      updatedRooms[index].availability.day[day].time = dayAvailability.filter(slot => slot.time !== time);
    } else {
      updatedRooms[index].availability.day[day].time.push({ time, available: true });
    }
    
    updatedRooms[index].isModified = true;
    setRooms(updatedRooms);
  };

  const handleAddFaculty = async () => {
    if (!newFaculty.trim()) {
      alert("Please enter a faculty name!");
      return;
    }
    
    setSelectedFaculty(newFaculty);
    setFaculties([...faculties, newFaculty]);
    setNewFaculty("");
    setIsAddingFaculty(false);
    setRooms([]);
    setFilteredRooms([]);
  };

  const cancelAddFaculty = () => {
    setNewFaculty("");
    setIsAddingFaculty(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">{/*Page Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-6 h-6 text-gray-700" />
              <h1 className="text-2xl font-semibold text-gray-900">
                Room Management
              </h1>
            </div>
            <p className="text-sm text-gray-600">Manage rooms by faculty</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 text-sm">
              {successMessage}
            </div>
          )}

          {/* Selection Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              {/* Faculty Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">Faculty</label>
                {!isAddingFaculty ? (
                  <>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      value={selectedFaculty}
                      onChange={(e) => {
                        setSelectedFaculty(e.target.value);
                        fetchRooms(e.target.value);
                      }}
                    >
                      <option value="">Select Faculty</option>
                      {faculties.map((faculty, index) => (
                        <option key={index} value={faculty}>{faculty}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setIsAddingFaculty(true)}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Faculty
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      placeholder="Enter new faculty name"
                      value={newFaculty}
                      onChange={(e) => setNewFaculty(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddFaculty()}
                      autoFocus
                    />
                    <button
                      onClick={handleAddFaculty}
                      className="px-3 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelAddFaculty}
                      className="px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search and Actions */}
          {selectedFaculty && (
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rooms by ID or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={openAddRoomModal}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Room
                </button>
                <button
                  onClick={handleUpdateAll}
                  disabled={saving || rooms.filter(r => r.isModified || !r.unid).length === 0}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : `Update All ${rooms.filter(r => r.isModified || !r.unid).length > 0 ? `(${rooms.filter(r => r.isModified || !r.unid).length})` : ""}`}
                </button>
              </div>
            </div>
          )}

          {/* Rooms Table */}
          {selectedFaculty && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Room ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Room Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-32">Capacity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Availability</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRooms.map((room, index) => {
                      const actualIndex = rooms.findIndex(r => r.unid === room.unid || (r.ID === room.ID && r.name === room.name));
                      return (
                        <tr key={room.unid || index} className={room.isModified ? "bg-amber-50" : ""}>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                              value={room.ID || ""}
                              onChange={(e) => updateRoomField(actualIndex, "ID", e.target.value)}
                              placeholder="Room ID"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                              value={room.name || ""}
                              onChange={(e) => updateRoomField(actualIndex, "name", e.target.value)}
                              placeholder="Room Name"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                              value={room.capacity || ""}
                              onChange={(e) => updateRoomField(actualIndex, "capacity", e.target.value)}
                              placeholder="Capacity"
                            />
                          </td>
                          <td className="px-4 py-3 relative">
                            <button
                              className="w-full px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                              onClick={() => setSelectedRoomIndex(actualIndex)}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Select Availability
                            </button>

                            {selectedRoomIndex === actualIndex && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setSelectedRoomIndex(null)}
                                />
                                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50" style={{ maxHeight: "400px", maxWidth: "600px", overflowX: "auto", overflowY: "auto" }}>
                                  <div className="p-3">
                                    <div className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Select Availability</div>
                                    <table className="w-full border-collapse border text-xs">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="border border-gray-300 p-1">Time</th>
                                          {["mon", "tue", "wed", "thu", "fri", "sat"].map(day => (
                                            <th key={day} className="border border-gray-300 p-1">{day.toUpperCase()}</th>
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
                                            <td className="border border-gray-300 p-1 whitespace-nowrap">{time}</td>
                                            {["mon", "tue", "wed", "thu", "fri", "sat"].map(day => (
                                              <td key={day} className="border border-gray-300 p-1 text-center">
                                                <input
                                                  type="checkbox"
                                                  checked={room.availability.day[day]?.time.some(slot => slot.time === time)}
                                                  onChange={() => toggleAvailability(actualIndex, day, time)}
                                                  className="rounded border-gray-300"
                                                />
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <button
                                      className="mt-3 w-full px-3 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                                      onClick={() => setSelectedRoomIndex(null)}
                                    >
                                      Done
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => saveRoom(actualIndex)}
                                className="inline-flex items-center justify-center px-2 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                                title={room.unid ? "Update" : "Save"}
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteRoom(actualIndex)}
                                className="inline-flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRooms.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                          {searchQuery ? "No rooms match your search." : "No rooms found. Click 'Add Room' to create a new room."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />

      {/* Add Room Modal */}
      {isAddRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Room</h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Room ID *</label>
                <input
                  ref={roomIdRef}
                  type="text"
                  value={newRoom.ID}
                  onChange={(e) => setNewRoom({ ...newRoom, ID: e.target.value })}
                  onKeyDown={handleRoomModalKeyDown}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Enter room ID"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Room Name *</label>
                <input
                  ref={roomNameRef}
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  onKeyDown={handleRoomModalKeyDown}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Enter room name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Capacity</label>
                <input
                  ref={roomCapacityRef}
                  type="number"
                  value={newRoom.capacity}
                  onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
                  onKeyDown={handleRoomModalKeyDown}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Enter capacity"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Availability</label>
                <div className="border border-gray-300 rounded overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-gray-400">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-2 text-left">Time</th>
                        {["mon", "tue", "wed", "thu", "fri", "sat"].map(day => (
                          <th key={day} className="border border-gray-300 p-2 text-center">{day.toUpperCase()}</th>
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
                          <td className="border border-gray-300 p-2 whitespace-nowrap">{time}</td>
                          {["mon", "tue", "wed", "thu", "fri", "sat"].map(day => (
                            <td key={day} className="border border-gray-300 p-2 text-center">
                              <input
                                type="checkbox"
                                checked={newRoom.availability.day[day]?.time.some(slot => slot.time === time)}
                                onChange={() => {
                                  const updatedAvailability = { ...newRoom.availability };
                                  if (!updatedAvailability.day[day]) {
                                    updatedAvailability.day[day] = { time: [] };
                                  }
                                  const dayAvailability = updatedAvailability.day[day].time;
                                  if (dayAvailability.some(slot => slot.time === time)) {
                                    updatedAvailability.day[day].time = dayAvailability.filter(slot => slot.time !== time);
                                  } else {
                                    updatedAvailability.day[day].time.push({ time, available: true });
                                  }
                                  setNewRoom({ ...newRoom, availability: updatedAvailability });
                                }}
                                className="rounded border-gray-300"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={closeAddRoomModal}
                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveNewRoom(true)}
                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Save and Add More
              </button>
              <button
                onClick={() => saveNewRoom(false)}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
              >
                Save and Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomLoad;
