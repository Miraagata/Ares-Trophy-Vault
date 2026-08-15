import multer from "multer";
import JSZip from "jszip";
import { parseTROPCONF, parsePARAMSFO, parseTROPUSR, extractAllTimestampsFromDAT, updateTROPUSR, recalculateDatHash } from "./src/lib/ps3Parser";
import express from "express";
import path from "path";
import fs from "fs";

async function startServer() {
  // Load environment variables silently if dotenv exists
  try {
    const dotenv = await import("dotenv");
    dotenv.config();
  } catch (e) {
    // Ignore if not installed
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "20mb" }));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Gemini API Endpoint for AI Trophy Timeline Generation
  app.post("/api/gemini/generate-timeline", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      // Initialize Gemini AI client lazily
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const { gameTitle, trophies, startDate, endDate, playstyle, notes } = req.body;

      if (!gameTitle || !trophies || !Array.isArray(trophies)) {
        return res.status(400).json({ error: "Missing required fields: gameTitle and trophies array." });
      }

      const prompt = `You are an expert trophy hunter and game analyst.
Generating realistic PS3 trophy timestamps for: "${gameTitle}".
Start Date: ${startDate || "2024-01-01T10:00"}
End Date: ${endDate || "2024-01-15T22:00"}
Playstyle Mode: ${playstyle || "casual"} (casual = spread over days/weeks, speedrun = dense rapid sessions, hardcore = intense long gaming sessions)
Additional Context: ${notes || "None"}

Here is the trophy list (${trophies.length} trophies):
${JSON.stringify(
  trophies.map((t: any) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    type: t.type, // Platinum, Gold, Silver, Bronze
    groupName: t.groupName || "Base Game",
  })),
  null,
  2
)}

STRICT RULES:
1. Story progression & introductory trophies MUST come first.
2. Harder/Gold/Grind trophies should be spread out naturally over time.
3. The Platinum trophy (type "Platinum") MUST be the VERY LAST trophy unlocked. Its timestamp must be at least 2-10 minutes after the second-to-last trophy.
4. Timestamps must be valid ISO-8601 strings within the start date and end date range.
5. Provide a realistic interval between trophy unlocks (from 15 minutes to several hours/days depending on trophy difficulty).

Return ONLY a JSON array of objects with fields:
- "id": number (matching the trophy id)
- "timestamp": string (ISO date string, e.g. "2024-01-02T14:30:00Z")
- "reasoning": string (brief explanation of why this time makes sense for this trophy)
`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      let text = response.text || "[]";
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsed = [];
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        console.error("Failed to parse Gemini JSON output:", text);
        return res.status(500).json({ error: "Invalid response format from AI model.", raw: text });
      }

      return res.json({ success: true, schedule: parsed });
    } catch (error: any) {
      console.error("Gemini timeline generation error:", error);
      return res.status(500).json({ error: error.message || "Failed to generate AI timeline." });
    }
  });

  app.post("/api/gemini/fetch-trophies", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const { titleId, gameTitle, numTrophies } = req.body;
      if (!titleId || !numTrophies) {
        return res.status(400).json({ error: "Missing required fields: titleId and numTrophies." });
      }

      const prompt = `You are a PS3 trophy database. Return the EXACT original PS3 trophy list for the game with ID ${titleId} (Game Title: ${gameTitle || "Unknown"}). The game has exactly ${numTrophies} trophies.
Return ONLY a JSON array of objects with these fields:
- "id": number (from 0 to ${numTrophies - 1}, where Platinum is usually 0)
- "name": string (the actual trophy name)
- "description": string (the actual trophy description)
- "type": string ("Platinum", "Gold", "Silver", or "Bronze")

Order by original PS3 ID (Platinum is always 0).
Do not include markdown blocks, just raw JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      let text = response.text || "[]";
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsed = [];
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        console.error("Failed to parse Gemini JSON output:", text);
        return res.status(500).json({ error: "Invalid response format from AI model.", raw: text });
      }

      return res.json({ success: true, trophies: parsed });
    } catch (error: any) {
      console.error("Gemini fetch error:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch AI trophies." });
    }
  });


  app.post("/api/upload-trophy-files", upload.array("files"), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      console.log("Received files:", files ? files.map(f => f.originalname) : "None");
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
      }

      let tropconfBuffer, paramsfoBuffer, tropusrBuffer;
      const images: Record<string, string> = {};

      for (const file of files) {
        const name = file.originalname.toUpperCase();
        
        if (name.endsWith(".ZIP")) {
          const zip = await JSZip.loadAsync(file.buffer);
          for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir) continue;
            
            const upperName = relativePath.toUpperCase();
            if (upperName.endsWith("TROPCONF.SFM")) {
              tropconfBuffer = await zipEntry.async("nodebuffer");
            } else if (upperName.endsWith("PARAM.SFO")) {
              paramsfoBuffer = await zipEntry.async("nodebuffer");
            } else if (upperName.endsWith("TROPUSR.DAT")) {
              tropusrBuffer = await zipEntry.async("nodebuffer");
            } else if (upperName.endsWith(".PNG")) {
              const match = upperName.match(/TROP(\d+)\.PNG/);
              if (match) {
                const imgBuf = await zipEntry.async("nodebuffer");
                images[parseInt(match[1], 10)] = `data:image/png;base64,${imgBuf.toString("base64")}`;
              }
            }
          }
        } else {
          if (name.endsWith("TROPCONF.SFM")) tropconfBuffer = file.buffer;
          else if (name.endsWith("PARAM.SFO")) paramsfoBuffer = file.buffer;
          else if (name.endsWith("TROPUSR.DAT")) tropusrBuffer = file.buffer;
          else if (name.endsWith(".PNG")) {
            const match = name.match(/TROP(\d+)\.PNG/);
            if (match) {
              images[parseInt(match[1], 10)] = `data:image/png;base64,${file.buffer.toString("base64")}`;
            }
          }
        }
      }

      if (!tropconfBuffer || !paramsfoBuffer || !tropusrBuffer) {
        return res.status(400).json({ error: "Faltam arquivos obrigatórios (TROPCONF.SFM, PARAM.SFO, TROPUSR.DAT)." });
      }

      const profile = parsePARAMSFO(paramsfoBuffer);
      let trophies = parseTROPCONF(tropconfBuffer);
      trophies = parseTROPUSR(tropusrBuffer, trophies);

      for (const trophy of trophies) {
        if (images[trophy.id]) {
          trophy.base64Image = images[trophy.id];
        }
      }

      const originalUsrDat = tropusrBuffer.toString("base64");

      return res.json({ success: true, profile, trophies, originalUsrDat });
    } catch (error: any) {
      console.error("Erro no processamento dos arquivos:", error);
      res.status(500).json({ error: "Falha ao ler os dados.", details: error.message });
    }
  });


  app.post("/api/parse-source-dat", upload.single("sourceDat"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
      }
      
      const timestamps = extractAllTimestampsFromDAT(req.file.buffer);
      return res.json({ success: true, timestamps });
    } catch (error: any) {
      console.error("Erro no processamento do source DAT:", error);
      res.status(500).json({ error: "Falha ao ler o TROPUSR.DAT.", details: error.message });
    }
  });

  app.post("/api/export-tropusr", async (req, res) => {
    try {
      const { tropUsrBase64, trophies } = req.body;
      if (!tropUsrBase64 || !trophies) {
        return res.status(400).json({ error: "Dados inválidos para exportação." });
      }

      const originalBuffer = Buffer.from(tropUsrBase64, "base64");
      

      let updatedBuffer = updateTROPUSR(originalBuffer, trophies);
      updatedBuffer = recalculateDatHash(updatedBuffer);

      res.setHeader("Content-Disposition", "attachment; filename=TROPUSR.DAT");
      res.setHeader("Content-Type", "application/octet-stream");
      return res.send(updatedBuffer);
    } catch (error: any) {
      console.error("Erro na exportação:", error);
      res.status(500).json({ error: "Falha ao exportar TROPUSR.DAT", details: error.message });
    }
  });


  function serveStaticApp() {
    let distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      if (fs.existsSync(path.join(process.cwd(), "index.html"))) {
        distPath = process.cwd();
      } else if (typeof __dirname !== "undefined" && fs.existsSync(path.join(__dirname, "index.html"))) {
        distPath = __dirname;
      }
    }
    console.log(`Serving static web app from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Vite middleware for dev or static serving for production
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      serveStaticApp();
    }
  } else {
    serveStaticApp();
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n===================================================`);
    console.log(`🏆 Ares Trophy Vault - Online & Offline Ready`);
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
    console.log(`===================================================\n`);
  });
}

startServer().catch(err => { console.error("FATAL ERROR:", err); process.exit(1); });
