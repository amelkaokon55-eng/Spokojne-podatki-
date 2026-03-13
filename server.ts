import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("eduenroll.db");

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    level TEXT,
    trainerName TEXT,
    price REAL,
    coverImage TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainingId INTEGER,
    dateStart TEXT,
    dateEnd TEXT,
    location TEXT,
    capacity INTEGER,
    bookedCount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    FOREIGN KEY(trainingId) REFERENCES trainings(id)
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    sessionId INTEGER,
    status TEXT DEFAULT 'confirmed',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    userName TEXT,
    userEmail TEXT,
    FOREIGN KEY(sessionId) REFERENCES sessions(id)
  );
`);

// Seed initial data if empty
const trainingCount = db.prepare("SELECT COUNT(*) as count FROM trainings").get() as { count: number };
if (trainingCount.count === 0) {
  const insertTraining = db.prepare(`
    INSERT INTO trainings (title, description, category, level, trainerName, price, coverImage)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const t1 = insertTraining.run(
    "Zmiany w VAT 2026", 
    "Kompleksowe omówienie najnowszych nowelizacji ustawy o VAT i ich wpływu na Twój biznes.", 
    "Podatki", 
    "Średni", 
    "Aneta Solecka", 
    499.00, 
    "https://picsum.photos/seed/tax/800/600"
  ).lastInsertRowid;

  const t2 = insertTraining.run(
    "Księgowość dla JDG", 
    "Wszystko co musisz wiedzieć o prowadzeniu własnej księgowości i optymalizacji kosztów.", 
    "Księgowość", 
    "Podstawowy", 
    "Aneta Solecka", 
    299.00, 
    "https://picsum.photos/seed/accounting/800/600"
  ).lastInsertRowid;

  const insertSession = db.prepare(`
    INSERT INTO sessions (trainingId, dateStart, dateEnd, location, capacity)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertSession.run(t1, "2026-04-15T09:00:00", "2026-04-15T17:00:00", "Warszawa / Online", 15);
  insertSession.run(t1, "2026-05-10T09:00:00", "2026-05-10T17:00:00", "Kraków", 12);
  insertSession.run(t2, "2026-04-20T10:00:00", "2026-04-20T16:00:00", "Wrocław / Online", 25);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/trainings", (req, res) => {
    const trainings = db.prepare("SELECT * FROM trainings").all();
    res.json(trainings);
  });

  app.get("/api/trainings/:id/sessions", (req, res) => {
    const sessions = db.prepare("SELECT * FROM sessions WHERE trainingId = ?").all(req.params.id);
    res.json(sessions);
  });

  app.post("/api/enroll", (req, res) => {
    const { sessionId, userName, userEmail } = req.body;
    
    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as any;
    
    if (!session) {
      return res.status(404).json({ error: "Sesja nie istnieje" });
    }

    const status = session.bookedCount >= session.capacity ? 'waitlist' : 'confirmed';

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO enrollments (userId, sessionId, userName, userEmail, status)
        VALUES (?, ?, ?, ?, ?)
      `).run("user-1", sessionId, userName, userEmail, status);

      if (status === 'confirmed') {
        db.prepare("UPDATE sessions SET bookedCount = bookedCount + 1 WHERE id = ?")
          .run(sessionId);
      }
    });

    transaction();
    res.json({ success: true, status });
  });

  app.post("/api/enrollments/:id/cancel", (req, res) => {
    const enrollmentId = req.params.id;
    const enrollment = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(enrollmentId) as any;

    if (!enrollment) {
      return res.status(404).json({ error: "Zapis nie istnieje" });
    }

    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM enrollments WHERE id = ?").run(enrollmentId);

      if (enrollment.status === 'confirmed') {
        db.prepare("UPDATE sessions SET bookedCount = bookedCount - 1 WHERE id = ?")
          .run(enrollment.sessionId);
        
        // Move first person from waitlist to confirmed
        const nextInLine = db.prepare(`
          SELECT * FROM enrollments 
          WHERE sessionId = ? AND status = 'waitlist' 
          ORDER BY createdAt ASC LIMIT 1
        `).get(enrollment.sessionId) as any;

        if (nextInLine) {
          db.prepare("UPDATE enrollments SET status = 'confirmed' WHERE id = ?").run(nextInLine.id);
          db.prepare("UPDATE sessions SET bookedCount = bookedCount + 1 WHERE id = ?")
            .run(enrollment.sessionId);
        }
      }
    });

    transaction();
    res.json({ success: true });
  });

  app.get("/api/organizer/stats", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        t.title, 
        s.dateStart, 
        s.location, 
        s.capacity, 
        s.bookedCount,
        (SELECT COUNT(*) FROM enrollments WHERE sessionId = s.id AND status = 'waitlist') as waitlistCount
      FROM sessions s
      JOIN trainings t ON s.trainingId = t.id
    `).all();
    res.json(stats);
  });

  app.get("/api/organizer/enrollments", (req, res) => {
    const enrollments = db.prepare(`
      SELECT e.*, t.title as trainingTitle, s.dateStart
      FROM enrollments e
      JOIN sessions s ON e.sessionId = s.id
      JOIN trainings t ON s.trainingId = t.id
      ORDER BY e.createdAt DESC
    `).all();
    res.json(enrollments);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
