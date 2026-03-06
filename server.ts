import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("tou_meter.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    customer_id TEXT,
    pea_meter_id TEXT,
    billing_month INTEGER,
    billing_year INTEGER,
    reading_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_json TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/readings", (req, res) => {
    const rows = db.prepare("SELECT * FROM readings ORDER BY reading_date DESC").all();
    res.json(rows.map(row => ({
      ...row,
      data: JSON.parse(row.data_json)
    })));
  });

  app.get("/api/readings/:id", (req, res) => {
    const row = db.prepare("SELECT * FROM readings WHERE id = ?").get(req.params.id);
    if (row) {
      res.json({
        ...row,
        data: JSON.parse(row.data_json)
      });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.post("/api/readings", (req, res) => {
    const { customer_name, customer_id, pea_meter_id, billing_month, billing_year, ...data } = req.body;
    // If data is empty (because it was sent flat), use the whole body as data
    const dataToStore = Object.keys(data).length > 0 ? data : req.body;
    
    const info = db.prepare(
      "INSERT INTO readings (customer_name, customer_id, pea_meter_id, billing_month, billing_year, data_json) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(customer_name, customer_id, pea_meter_id, billing_month, billing_year, JSON.stringify(dataToStore));
    
    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
