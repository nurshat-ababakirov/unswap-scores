// api/api-history.js
import { parse } from "csv-parse/sync";

// Helper: extract PI code from Performance_Indicator field
function extractPiCode(s) {
  if (!s) return null;
  const t = String(s).toUpperCase().replace(/\u00A0/g, " ").trim();
  const m = t.match(/^PI\d{1,2}\b/);
  return m ? m[0] : null;
}

// Helper: normalize string for comparison
function normalizeString(s) {
  if (!s) return null;
  return String(s).toUpperCase().replace(/\u00A0/g, " ").trim();
}

// Helper: safe integer conversion
function safeParseInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

export default async function handler(req, res) {
  try {
    // Support both GET (query params) and POST (body)
    const method = req.method.toUpperCase();
    let params;
    
    if (method === "GET") {
      params = req.query || {};
    } else if (method === "POST") {
      params = req.body || {};
    } else {
      res.setHeader("Allow", "GET, POST");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(405).json({ error: "Use GET with query params or POST with JSON body" });
    }

    // Extract all possible filter parameters
    const {
      entity,
      type,
      performance_area,
      pi,
      ratings,
      score,
      start_year,
      end_year,
      limit
    } = params;

    // Validate year parameters if provided
    const startYear = safeParseInt(start_year);
    const endYear = safeParseInt(end_year);
    const scoreFilter = safeParseInt(score);
    const limitFilter = safeParseInt(limit) || null;

    if (start_year && startYear === null) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(400).json({ error: "start_year must be a valid integer" });
    }
    
    if (end_year && endYear === null) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(400).json({ error: "end_year must be a valid integer" });
    }

    if (startYear && endYear && startYear > endYear) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(400).json({ error: "start_year cannot be greater than end_year" });
    }

    if (limitFilter && (limitFilter < 1 || limitFilter > 1000)) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(400).json({ error: "limit must be between 1 and 1000" });
    }

    const csvUrl = process.env.CSV_URL;
    if (!csvUrl) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(500).json({ error: "CSV_URL env not set" });
    }

    // Fetch and parse CSV
    const resp = await fetch(csvUrl);
    if (!resp.ok) throw new Error(`CSV download failed: ${resp.status}`);
    const csvText = await resp.text();
    const records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

    // Normalize filter values
    const wantEntity = entity ? normalizeString(entity) : null;
    const wantType = type ? normalizeString(type) : null;
    const wantPerformanceArea = performance_area ? normalizeString(performance_area) : null;
    const wantPI = pi ? normalizeString(pi) : null;
    const wantRatings = ratings ? normalizeString(ratings) : null;

    // Filter records
    let filteredRows = records.filter(r => {
      // Year filter
      const recordYear = safeParseInt(r.Year);
      if (recordYear === null) return false;
      if (startYear && recordYear < startYear) return false;
      if (endYear && recordYear > endYear) return false;

      // Entity filter
      if (wantEntity) {
        const recordEntity = normalizeString(r.Entity);
        if (recordEntity !== wantEntity) return false;
      }

      // Type filter
      if (wantType) {
        const recordType = normalizeString(r.Type);
        if (recordType !== wantType) return false;
      }

      // Performance Area filter
      if (wantPerformanceArea) {
        const recordPA = normalizeString(r.Performance_Area);
        if (recordPA !== wantPerformanceArea) return false;
      }

      // PI filter
      if (wantPI) {
        const code = extractPiCode(r.Performance_Indicator);
        if (code !== wantPI) return false;
      }

      // Ratings filter
      if (wantRatings) {
        const recordRatings = normalizeString(r.Ratings);
        if (recordRatings !== wantRatings) return false;
      }

      // Score filter
      if (scoreFilter !== null) {
        const recordScore = safeParseInt(r.Score);
        if (recordScore !== scoreFilter) return false;
      }

      return true;
    });

    // Transform records to consistent format
    const transformedRows = filteredRows.map(r => ({
      Entity: r.Entity,
      Type: r.Type || null,
      Year: safeParseInt(r.Year),
      Performance_Area: r.Performance_Area || null,
      PerformanceIndicator: r.Performance_Indicator,
      Ratings: r.Ratings || null,
      Score: safeParseInt(r.Score)
    }));

    // Apply limit if specified
    const totalRecords = transformedRows.length;
    const finalRows = limitFilter ? transformedRows.slice(0, limitFilter) : transformedRows;

    // Prepare response
    const response = {
      filters: {
        entity: entity || null,
        type: type || null,
        performance_area: performance_area || null,
        pi: pi || null,
        ratings: ratings || null,
        score: scoreFilter,
        start_year: startYear,
        end_year: endYear,
        limit: limitFilter
      },
      total_records: totalRecords,
      returned_records: finalRows.length,
      rows: finalRows
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json(response);

  } catch (e) {
    console.error(e);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(500).json({ error: String(e.message || e) });
  }
}
