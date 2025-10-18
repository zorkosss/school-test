const firebaseConfig = { apiKey: "AIzaSyBX3-pcg4gCUzHdPuRhP9BPTKbJr4zM2Mc", authDomain: "school-attendance-81385.firebaseapp.com", projectId: "school-attendance-81385", storageBucket: "school-attendance-81385.firebasestorage.app", messagingSenderId: "232756214397", appId: "1:232756214397:web:67de1961741864be744f14" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables for supervisor data
let supervisorDivisions = [];
window.allAbsences = [];

// Authentication state change handler
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        // Redirect to login if not authenticated
        window.location.href = "supervisor_login.html";
        return;
    }

    // Check if user is a principal/supervisor
    const supervisorDocRef = db.collection("principals").doc(user.uid);
    const supervisorDocSnap = await supervisorDocRef.get();

    if (!supervisorDocSnap.exists) {
        alert("Access Denied: You do not have a supervisor account.");
        await auth.signOut();
        window.location.href = "supervisor_login.html";
        return;
    }

    // Store allowed divisions and show dashboard
    supervisorDivisions = supervisorDocSnap.data().divisions || [];
    document.body.style.display = "flex";
    document.getElementById('loading').classList.add('visible');
    fetchAbsences();
});

async function fetchAbsences() {
    try {
        const response = await fetch('https://ziad-school-app.onrender.com/absences');
        if (!response.ok) { throw new Error(`Server error: ${response.status}`); }
        
        const serverReports = await response.json();
        
        const allowedDivs = (supervisorDivisions || []).map(d => String(d||'').trim().toLowerCase());
        window.allAbsences = serverReports
            .map(report => ({ ...report, timestamp: new Date(report.timestamp) }))
            .filter(report => {
                const div = String(report.division||'').trim().toLowerCase();
                return allowedDivs.includes(div);
            });

        const activeAbsences = window.allAbsences.filter(report => (report.status||'active') !== 'archived');
        renderReports(activeAbsences);
        document.getElementById('loading').classList.remove('visible');
    } catch (error) {
        console.error("Failed to fetch absences:", error);
        document.getElementById("absenceList").innerHTML = "<p style='color: red; text-align: center;'>Error loading data. Please try again later.</p>";
        document.getElementById('loading').classList.remove('visible');
    }
}
window.renderReports = renderReports;

function renderReports(reportsToDisplay) {
    const reportsContainer = document.getElementById("absenceList");
    const emptyStateContainer = document.getElementById("empty-state-container");
    reportsContainer.innerHTML = '';

    if (reportsToDisplay.length > 0) {
        emptyStateContainer.style.display = 'none';
        reportsToDisplay.forEach(reportData => {
            const card = document.createElement("div");
            card.className = "card";
            const formattedTime = reportData.timestamp.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            card.innerHTML = `
                <div class="card-header"><i class="fas fa-school"></i> ${reportData.class}</div>
                <div class="card-body">
                    <p><i class="fas fa-building"></i> <strong>Division:</strong> ${reportData.division}</p>
                    <p><i class="fas fa-chalkboard"></i> <strong>Section:</strong> ${reportData.section}</p>
                    <p><i class="fas fa-user-group"></i> <strong>Absentees:</strong> ${reportData.absentees}</p>
                </div>
                <div class="card-footer"><i class="fas fa-clock"></i> Reported On: ${formattedTime}</div>
            `;
            reportsContainer.appendChild(card);
        });
    } else {
        emptyStateContainer.style.display = 'block';
    }
}

window.resetAbsences = async function() {
    if (!confirm("Are you sure you want to permanently delete today's absences? This action cannot be undone.")) return;
    try {
        const response = await fetch('https://ziad-school-app.onrender.com/absences/today', {
            method: 'DELETE'
        });
        const resultText = await response.text();
        alert(resultText);
        if (response.ok) {
            document.getElementById('loading').classList.add('visible');
            fetchAbsences();
        }
    } catch (error) {
        alert("An error occurred: " + error.message);
    }
}

window.logout = async function() { await auth.signOut(); window.location.href = "supervisor_login.html"; }
window.goAbout = function() { window.open("about_us.html", "_blank"); }

document.addEventListener('DOMContentLoaded', () => {
    const filtersContainer = document.querySelector('.filters-container');
    const filtersHeader = document.querySelector('.filters-header');
    const filtersContent = document.getElementById('filters-content');
    const filtersToggle = document.getElementById('filters-toggle');

    filtersHeader.addEventListener('click', () => {
        filtersContent.classList.toggle('collapsed');
        if (filtersContent.classList.contains('collapsed')) {
            filtersToggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
        } else {
            filtersToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
        }
    });
});
