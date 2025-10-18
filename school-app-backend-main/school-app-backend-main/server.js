// --- 1. Import Libraries ---
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const moment = require('moment-timezone');

// --- 2. Initialize Express and Firebase Admin ---
const app = express();
const staticWhitelist = [
  'https://zorkosss.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const whitelist = [...new Set([...staticWhitelist, ...envOrigins])];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin === 'null') return callback(null, true);
    if (whitelist.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.options('/health', cors(corsOptions));
app.options('/classes', cors(corsOptions));
app.options('/absences', cors(corsOptions));
app.options('/absences/today', cors(corsOptions));
app.use(express.json());

const serviceAccount = require('./service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// --- 3. API Endpoints ---
app.get('/health', (request, response) => {
  response.status(200).send('OK');
});

// Endpoint to get the full list of classes
app.get('/classes', async (request, response) => {
  try {
    const classesRef = db.collection('classes');
    const snapshot = await classesRef.orderBy('name').get(); // Order alphabetically by class name
    if (snapshot.empty) {
      return response.status(200).json([]);
    }
    const classList = [];
    snapshot.forEach(doc => {
      classList.push({ id: doc.id, ...doc.data() });
    });
    response.status(200).json(classList);
  } catch (error) {
    console.error('Error getting classes:', error);
    response.status(500).send('Error getting class list.');
  }
});

app.post('/absences', async (request, response) => {
    try {
        const newAbsence = {
            division: request.body.division,
            class: request.body.class,
            section: request.body.section, // Now includes section
            absentees: request.body.absentees,
            status: 'active',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };
        const addedDoc = await db.collection('absences').add(newAbsence);
        response.status(201).send(`Created a new absence report with ID: ${addedDoc.id}`);
    } catch (error) {
        console.error('Error creating report:', error);
        response.status(500).send('Error creating report: ' + error.message);
    }
});

app.get('/absences', async (request, response) => {
    try {
        const absencesRef = db.collection('absences');
        const snapshot = await absencesRef.orderBy('timestamp', 'desc').get();
        if (snapshot.empty) { return response.status(200).json([]); }
        const reports = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            reports.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
            });
        });
        response.status(200).json(reports);
    } catch (error) {
        console.error('Error getting documents:', error);
        response.status(500).send('Error getting documents: ' + error.message);
    }
});

app.delete('/absences/today', async (request, response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const q = db.collection('absences').where('timestamp', '>=', today);
        const snapshot = await q.get();
        if (snapshot.empty) { return response.status(200).send("No reports from today to delete."); }
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        response.status(200).send(`Successfully deleted ${snapshot.size} of today's reports.`);
    } catch (error) {
        console.error("Error deleting today's reports:", error);
        response.status(500).send("Error deleting reports: " + error.message);
    }
});

app.post('/tasks/archive-yesterdays-reports-secret123', async (request, response) => {
    console.log('Received scheduled request to run end-of-day archiving task...');
    try {
        const nowInBeirut = moment().tz("Asia/Beirut");
        const dayToArchiveStart = nowInBeirut.clone().subtract(1, 'days').startOf('day').toDate();
        const dayToArchiveEnd = nowInBeirut.clone().subtract(1, 'days').endOf('day').toDate();
        console.log(`Searching for reports between ${dayToArchiveStart.toISOString()} and ${dayToArchiveEnd.toISOString()}`);
        const reportsToArchiveQuery = db.collection('absences').where('status', '==', 'active').where('timestamp', '>=', dayToArchiveStart).where('timestamp', '<=', dayToArchiveEnd);
        const snapshot = await reportsToArchiveQuery.get();
        if (snapshot.empty) {
            console.log('No active reports from the previous day to archive.');
            return response.status(200).send('No active reports to archive.');
        }
        const batch = db.batch();
        snapshot.forEach(doc => {
            const docRef = db.collection('absences').doc(doc.id);
            batch.update(docRef, { status: 'archived' });
        });
        await batch.commit();
        console.log(`Successfully archived ${snapshot.size} reports from the previous day.`);
        response.status(200).send(`Successfully archived ${snapshot.size} reports.`);
    } catch (error) {
        console.error('Error during archiving task:', error);
        response.status(500).send('Error during archiving task: ' + error.message);
    }
});

// --- 5. Start the Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

