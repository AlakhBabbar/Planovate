// filepath: /c:/Users/anish/Desktop/DEI/Practice/pages/RoomList.jsx
import React, { useState, useEffect } from 'react';

const RoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoom, setNewRoom] = useState({ room: '', building: '', capacity: '' });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/rooms');
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      setRooms(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setLoading(false);
    }
  };

  const handleAddRoom = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRoom),
      });
      if (!response.ok) {
        throw new Error('Failed to add room');
      }
      const data = await response.json();
      setRooms([...rooms, data]);
      setNewRoom({ room: '', building: '', capacity: '' });
    } catch (error) {
      console.error('Error adding room:', error);
    }
  };

  const handleDeleteRoom = async (id) => {
    try {
      const response = await fetch(`http://localhost:5001/api/rooms/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete room');
      }
      setRooms(rooms.filter((room) => room._id !== id));
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* <h1 className="text-2xl font-bold mb-4">Room List</h1> */}
      <div className="mb-4 my-6">
        <input
          type="text"
          placeholder="Room Number"
          value={newRoom.room}
          onChange={(e) => setNewRoom({ ...newRoom, room: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Building"
          value={newRoom.building}
          onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="number"
          placeholder="Capacity"
          value={newRoom.capacity}
          onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
          className="border p-2 mr-2"
        />
        <button onClick={handleAddRoom} className="bg-blue-500 text-white p-2 rounded">Add Room</button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Room</th>
            <th className="border p-2">Building</th>
            <th className="border p-2">Capacity</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room._id}>
              <td className="border p-2">{room.room}</td>
              <td className="border p-2">{room.building}</td>
              <td className="border p-2">{room.capacity}</td>
              <td className="border p-2">
                <button onClick={() => handleDeleteRoom(room._id)} className="bg-red-500 text-white p-2 rounded">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RoomList;