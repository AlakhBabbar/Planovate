import React, { useState } from 'react';

function TeacherManagement() {
  const [departments, setDepartments] = useState([
    { id: 1, name: '', rows: [{ id: Date.now(), teacherId: '', name: '', faculty: '', isAdded: false }] }
  ]);

  const handleInputChange = (deptId, rowId, field, value) => {
    setDepartments((prev) =>
      prev.map((dept) =>
        dept.id === deptId
          ? {
              ...dept,
              rows: dept.rows.map((row) =>
                row.id === rowId ? { ...row, [field]: value } : row
              )
            }
          : dept
      )
    );
  };

  const handleAddRow = (deptId) => {
    setDepartments((prev) =>
      prev.map((dept) =>
        dept.id === deptId
          ? {
              ...dept,
              rows: [...dept.rows, { id: Date.now(), teacherId: '', name: '', faculty: '', isAdded: false }]
            }
          : dept
      )
    );
  };

  const handleDeleteRow = (deptId, rowId) => {
    setDepartments((prev) =>
      prev.map((dept) =>
        dept.id === deptId
          ? {
              ...dept,
              rows: dept.rows.filter((row) => row.id !== rowId)
            }
          : dept
      )
    );
  };

  const handleAddDepartment = () => {
    setDepartments((prev) => [
      ...prev,
      { id: Date.now(), name: '', rows: [{ id: Date.now(), teacherId: '', name: '', faculty: '', isAdded: false }] }
    ]);
  };

  const handleSubmit = (deptId, rowId) => {
    const department = departments.find((dept) => dept.id === deptId);
    const row = department.rows.find((row) => row.id === rowId);
  
    // Construct the data object to include the required fields
    const dataToSend = {
      unid: rowId,  
      ID: row.teacherId,
      name: row.name,
      faculty: row.faculty,
      department: department.name,
    };
  
    console.log("Data being sent to backend:", dataToSend);
  
    fetch('/teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend),
    }).then((res) => {
      if (res.ok) {
        setDepartments((prev) =>
          prev.map((dept) =>
            dept.id === deptId
              ? {
                  ...dept,
                  rows: dept.rows.map((r) =>
                    r.id === rowId ? { ...r, isAdded: true } : r
                  ),
                }
              : dept
          )
        );
      }
    });
  };

  const handleUpdate = (deptId, rowId) => {
    const department = departments.find((dept) => dept.id === deptId);
    const row = department.rows.find((row) => row.id === rowId);

    // Construct the data object to include the required fields
    const dataToSend = {
        unid: rowId,
        ID: row.teacherId,
        name: row.name,
        faculty: row.faculty,
        department: department.name,
      };

    console.log(dataToSend);
    fetch(`/teacher/${rowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend)
    }).then((res) => {
      if (res.ok) {
        alert('Data updated successfully');
      }
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Teacher Load</h1>
      {departments.map((department) => (
        <div key={department.id} className="mb-8 border p-4">
          <div className="mb-4">
            <label className="block mb-2 font-medium">Department</label>
            <input
              type="text"
              className="border p-2 w-full"
              value={department.name}
              onChange={(e) =>
                setDepartments((prev) =>
                  prev.map((dept) =>
                    dept.id === department.id ? { ...dept, name: e.target.value } : dept
                  )
                )
              }
            />
          </div>
          <table className="table-auto w-full mb-4">
            <thead>
              <tr>
                <th className="border px-4 py-2">Teacher ID</th>
                <th className="border px-4 py-2">Name</th>
                <th className="border px-4 py-2">Faculty</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {department.rows.map((row) => (
                <tr key={row.id}>
                  <td className="border px-4 py-2">
                    <input
                      type="text"
                      className="w-full border p-2"
                      value={row.teacherId}
                      onChange={(e) =>
                        handleInputChange(department.id, row.id, 'teacherId', e.target.value)
                      }
                    />
                  </td>
                  <td className="border px-4 py-2">
                    <input
                      type="text"
                      className="w-full border p-2"
                      value={row.name}
                      onChange={(e) =>
                        handleInputChange(department.id, row.id, 'name', e.target.value)
                      }
                    />
                  </td>
                  <td className="border px-4 py-2">
                    <input
                      type="text"
                      className="w-full border p-2"
                      value={row.faculty}
                      onChange={(e) =>
                        handleInputChange(department.id, row.id, 'faculty', e.target.value)
                      }
                    />
                  </td>
                  <td className="border px-4 py-2 text-center">
                    {row.isAdded ? (
                      <button
                        className="bg-yellow-500 text-white px-4 py-2 mr-2"
                        onClick={() => handleUpdate(department.id, row.id)}
                      >
                        Update
                      </button>
                    ) : (
                      <button
                        className="bg-blue-500 text-white px-4 py-2 mr-2"
                        onClick={() => handleSubmit(department.id, row.id)}
                      >
                        Add
                      </button>
                    )}
                    {department.rows.length > 1 && (
                      <button
                        className="bg-red-500 text-white px-4 py-2"
                        onClick={() => handleDeleteRow(department.id, row.id)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            className="bg-green-500 text-white px-4 py-2"
            onClick={() => handleAddRow(department.id)}
          >
            Add Row
          </button>
        </div>
      ))}
      <button
        className="bg-gray-500 text-white px-4 py-2"
        onClick={handleAddDepartment}
      >
        Add Department
      </button>
    </div>
  );
}

export default TeacherManagement;
