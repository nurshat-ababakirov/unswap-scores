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
    }

    const resp = await fetch(csvUrl);
    if (!resp.ok) throw new Error(`CSV download failed: ${resp.status}`);
    const csvText = await resp.text();

    const records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

    const wantEntity = String(entity).toUpperCase().trim();
    const wantPI = String(pi).toUpperCase().trim();
    const start = parseInt(start_year, 10);
    const end = parseInt(end_year, 10);

    const rows = records
      .filter(r => {
        const yr = parseInt(r.Year, 10);
        if (Number.isNaN(yr)) return false;

        const entityOk = String(r.Entity || "").toUpperCase().trim() === wantEntity;
        const code = extractPiCode(r.Performance_Indicator);
        const piOk = code === wantPI;
        const yearOk = yr >= start && yr <= end;

        return entityOk && piOk && yearOk;
      })
      .map(r => ({
        Entity: r.Entity,
        Year: Number(r.Year),
        PerformanceIndicator: r.Performance_Indicator,
        Ratings: r.Ratings || null,
        Score: r.Score !== "" && r.Score != null ? Number(r.Score) : null
      }));

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json({ entity, pi, start_year, end_year, rows });
  } catch (e) {
    console.error(e);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(500).json({ error: String(e.message || e) });
  }
}
