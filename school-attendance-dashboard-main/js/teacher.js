const firebaseConfig = { apiKey: "AIzaSyBX3-pcg4gCUzHdPuRhP9BPTKbJr4zM2Mc", authDomain: "school-attendance-81385.firebaseapp.com", projectId: "school-attendance-81385", storageBucket: "school-attendance-81385.firebasestorage.app", messagingSenderId: "232756214397", appId: "1:232756214397:web:67de1961741864be744f14" };

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let allClasses = [];

auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = "teacher_login.html"; return; }
    const teacherDocRef = db.collection("teachers").doc(user.uid);
    const teacherDocSnap = await teacherDocRef.get();
    if (!teacherDocSnap.exists) {
        alert("Access Denied: You do not have a teacher account.");
        await auth.signOut();
        window.location.href = "teacher_login.html";
        return;
    }
    document.body.style.display = "flex";
    document.getElementById("teacherName").innerText = user.email.split('@')[0];
    document.getElementById("currentDate").innerText = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    fetchClasses();
});

async function fetchClasses() {
    try {
        const response = await fetch('https://ziad-school-app.onrender.com/classes');
        if (!response.ok) throw new Error('Could not fetch class list');
        allClasses = await response.json();
        
        const divisionDropdown = document.getElementById('division');
        divisionDropdown.innerHTML = '<option value="" disabled selected>-- Select a Division --</option>';
        const divisions = [...new Set(allClasses.map(c => c.division))];
        divisions.sort().forEach(div => {
            const option = document.createElement('option');
            option.value = div;
            option.textContent = div;
            divisionDropdown.appendChild(option);
        });
    } catch (error) {
        console.error("Error fetching classes:", error);
        alert("Could not load class list from server.");
    }
}

document.getElementById('division').addEventListener('change', (event) => {
    const selectedDivision = event.target.value;
    const classDropdown = document.getElementById('className');
    const sectionDropdown = document.getElementById('section');
    classDropdown.innerHTML = '<option value="">-- Select a Class --</option>';
    sectionDropdown.innerHTML = '<option value="">-- First Select a Class --</option>';
    sectionDropdown.disabled = true;
    const classesInDivision = [...new Set(allClasses.filter(c => c.division === selectedDivision).map(c => c.name))];
    if (classesInDivision.length > 0) {
        classesInDivision.sort().forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classDropdown.appendChild(option);
        });
        classDropdown.disabled = false;
    } else {
        classDropdown.disabled = true;
    }
});

document.getElementById('className').addEventListener('change', (event) => {
    const selectedDivision = document.getElementById('division').value;
    const selectedClass = event.target.value;
    const sectionDropdown = document.getElementById('section');
    sectionDropdown.innerHTML = '<option value="">-- Select a Section --</option>';
    const sectionsForClass = allClasses.filter(c => c.division === selectedDivision && c.name === selectedClass).map(c => c.section);
    if (sectionsForClass.length > 0) {
        sectionsForClass.sort().forEach(sectionName => {
            const option = document.createElement('option');
            option.value = sectionName;
            option.textContent = sectionName;
            sectionDropdown.appendChild(option);
        });
        sectionDropdown.disabled = false;
    } else {
        sectionDropdown.disabled = true;
    }
});

async function submitAbsence() {
    const division = document.getElementById("division").value;
    const className = document.getElementById("className").value;
    const section = document.getElementById("section").value;
    const absentList = document.getElementById("absentList").value;

    if (!division || !className || !section || !absentList) { alert("Please fill out all fields."); return; }

    try {
        const response = await fetch('https://ziad-school-app.onrender.com/absences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                division: division,
                class: className,
                section: section,
                absentees: absentList,
            }),
        });
        if (!response.ok) { throw new Error(`Server responded with status: ${response.status}`); }
        alert("Absence report submitted successfully!");
        
        document.getElementById("division").value = "";
        document.getElementById("className").value = "";
        document.getElementById("className").innerHTML = '<option value="">-- First Select a Division --</option>';
        document.getElementById("className").disabled = true;
        document.getElementById("section").value = "";
        document.getElementById("section").innerHTML = '<option value="">-- First Select a Class --</option>';
        document.getElementById("section").disabled = true;
        document.getElementById("absentList").value = "";

    } catch (error) {
        alert("Error submitting report: " + error.message);
    }
}

window.submitAbsence = submitAbsence;
window.logout = async function() { await auth.signOut(); window.location.href = "teacher_login.html"; }
window.goAbout = function() { window.open("about_us.html", "_blank"); }
