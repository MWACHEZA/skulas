// Mock Student Data for Autocomplete
const mockStudents = [
    { id: "STU-001", name: "Alice Johnson", grade: "Form 4" },
    { id: "STU-002", name: "Bob Smith", grade: "Form 4" },
    { id: "STU-003", name: "Charlie Brown", grade: "Form 3" },
    { id: "STU-004", name: "David Wilson", grade: "Form 2" },
    { id: "STU-005", name: "Eva Davis", grade: "Form 1" },
    { id: "STU-006", name: "Frank Miller", grade: "Lower 6" },
    { id: "STU-007", name: "Grace Lee", grade: "Upper 6" },
    { id: "STU-008", name: "Henry Ford", grade: "Form 4" },
    { id: "STU-009", name: "Ivy Taylor", grade: "Form 3" },
    { id: "STU-010", name: "Jack Wilson", grade: "Form 2" }
];

function searchStudents(query) {
    query = query.toLowerCase();
    return mockStudents.filter(student =>
        student.name.toLowerCase().includes(query) ||
        student.id.toLowerCase().includes(query)
    );
}

