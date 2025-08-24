{
  "openapi": "3.1.0",
  "info": { "title": "UNSWAP API (Vercel)", "version": "1.0.0" },
  "servers": [{ "url": "https://unswap-scores.vercel.app" }],
  "paths": {
    "/api/ping": {
      "get": {
        "summary": "Ping server",
        "operationId": "ping",
        "responses": {
          "200": {
            "description": "pong",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "ok": { "type": "boolean" },
                    "t": { "type": "number" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/api-history": {
      "get": {
        "summary": "Retrieve PI reporting history",
        "operationId": "getPIHistory", 
        "parameters": [
          {
            "name": "entity",
            "in": "query",
            "required": true,
            "schema": { "type": "string", "example": "CTBTO" }
          },
          {
            "name": "pi", 
            "in": "query",
            "required": true,
            "schema": { "type": "string", "example": "PI2" }
          },
          {
            "name": "start_year",
            "in": "query", 
            "required": true,
            "schema": { "type": "integer", "example": 2018 }
          },
          {
            "name": "end_year",
            "in": "query",
            "required": true, 
            "schema": { "type": "integer", "example": 2024 }
          }
        ],
        "responses": {
          "200": {
            "description": "PI rows",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "entity": { "type": "string" },
                    "pi": { "type": "string" },
                    "start_year": { "type": "integer" },
                    "end_year": { "type": "integer" },
                    "rows": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "Entity": { "type": "string" },
                          "Year": { "type": "integer" },
                          "PerformanceIndicator": { "type": "string" },
                          "Ratings": { "type": "string", "nullable": true },
                          "Score": { "type": "integer", "nullable": true }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
