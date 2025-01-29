import React, { useState } from 'react';

function CourseManagement() {
  const [faculties, setFaculties] = useState([
    {
      id: 1,
      name: 'Faculty 1',
      departments: [
        {
          id: 1,
          name: 'Department 1',
          semesters: [
            {
              id: 1,
              name: 'Semester 1',
              rows: [{ id: Date.now(), courseId: '', name: '', isAdded: false }]
            }
          ]
        }
      ]
    }
  ]);

  const handleInputChange = (facultyId, deptId, semId, rowId, field, value) => {
    setFaculties((prev) =>
      prev.map((faculty) =>
        faculty.id === facultyId
          ? {
              ...faculty,
              departments: faculty.departments.map((dept) =>
                dept.id === deptId
                  ? {
                      ...dept,
                      semesters: dept.semesters.map((sem) =>
                        sem.id === semId
                          ? {
                              ...sem,
                              rows: sem.rows.map((row) =>
                                row.id === rowId ? { ...row, [field]: value } : row
                              )
                            }
                          : sem
                      )
                    }
                  : dept
              )
            }
          : faculty
      )
    );
  };

  const handleAddRow = (facultyId, deptId, semId) => {
    setFaculties((prev) =>
      prev.map((faculty) =>
        faculty.id === facultyId
          ? {
              ...faculty,
              departments: faculty.departments.map((dept) =>
                dept.id === deptId
                  ? {
                      ...dept,
                      semesters: dept.semesters.map((sem) =>
                        sem.id === semId
                          ? {
                              ...sem,
                              rows: [
                                ...sem.rows,
                                { id: Date.now(), courseId: '', name: '', isAdded: false }
                              ]
                            }
                          : sem
                      )
                    }
                  : dept
              )
            }
          : faculty
      )
    );
  };

  return (
    <div>
      <h1>Course Management</h1>
      {faculties.map((faculty) => (
        <div key={faculty.id}>
          <h2>{faculty.name}</h2>
          {faculty.departments.map((dept) => (
            <div key={dept.id} style={{ marginLeft: '20px' }}>
              <h3>{dept.name}</h3>
              {dept.semesters.map((sem) => (
                <div key={sem.id} style={{ marginLeft: '40px' }}>
                  <h4>{sem.name}</h4>
                  {sem.rows.map((row) => (
                    <div key={row.id} style={{ marginLeft: '60px' }}>
                      <input
                        type="text"
                        placeholder="Course ID"
                        value={row.courseId}
                        onChange={(e) =>
                          handleInputChange(faculty.id, dept.id, sem.id, row.id, 'courseId', e.target.value)
                        }
                      />
                      <input
                        type="text"
                        placeholder="Course Name"
                        value={row.name}
                        onChange={(e) =>
                          handleInputChange(faculty.id, dept.id, sem.id, row.id, 'name', e.target.value)
                        }
                      />
                      <button onClick={() => handleAddRow(faculty.id, dept.id, sem.id)}>Add Row</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default CourseManagement;