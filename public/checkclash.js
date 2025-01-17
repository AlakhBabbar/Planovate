document.addEventListener("DOMContentLoaded", () => {
    // Attach event listeners to all teacher inputs
    document.querySelectorAll('input[name="teacher"]').forEach(input => {
        input.addEventListener("blur", async (event) => {
            const teacherName = event.target.value.trim();
            const parentTd = event.target.closest("td");
            const day = parentTd.cellIndex - 1; // Adjust index for table
            const time = parentTd.parentElement.cells[0].innerText;

            // Check if teacherName is not empty
            if (teacherName) {
                const requestData = {
                    teacher: teacherName,
                    time,
                    day,
                    class: document.querySelector('input[name="class"]').value,
                    branch: document.querySelector('input[name="branch"]').value
                };

                try {
                    const response = await fetch("/check-clash", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(requestData),
                    });
                
                    if (!response.ok) {
                        throw new Error(`Server error: ${response.statusText}`);
                    }
                
                    const result = await response.json();
                
                    // Display result
                    if (result.clash) {
                        alert(`Clash detected: ${result.details}`);
                        event.target.style.border = "2px solid red";
                    } else {
                        alert("No clash detected");
                        event.target.style.border = "2px solid green";
                    }
                } catch (error) {
                    console.error("Error checking clash:", error);
                }                
            }
        });
    });
});