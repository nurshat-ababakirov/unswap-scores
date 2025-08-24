
// api/api-history.js
import { parse } from "csv-parse/sync";

// Helper: extract PI code from Performance_Indicator field
function extractPiCode(s) {
  if (!s) return null;
  const t = String(s).toUpperCase().replace(/\u00A0/g, " ").trim();
  const m = t.match(/^PI\d{1,2}\b/);
  return m ? m[0] : null;
}

export default async function handler(req, res) {
  try {
    // Support both GET (query params) and POST (body)
    const method = req.method.toUpperCase();

    let entity, pi, start_year, end_year;
    if (method === "GET") {
      ({ entity, pi, start_year, end_year } = req.query || {});
    } else if (method === "POST") {
      ({ entity, pi, start_year, end_year } = req.body || {});
    } else {
      res.setHeader("Allow", "GET, POST");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(405).json({ error: "Use GET with query params or POST with JSON body" });
    }

    if (!entity || !pi || !start_year || !end_year) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(400).json({
        error: "Missing params: entity, pi, start_year, end_year"
      });
    }

    const csvUrl = process.env.CSV_URL;
    if (!csvUrl) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(500).json({ error: "CSV_URL env not set" });
