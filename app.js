import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { handleIssue } from "./services/embedding.js";
import { listDocuments } from "./vector-store/chromadb.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// POST /analyze: Analyze a GitHub issue and find relevant files
app.post("/analyze", async (req, res) => {
  const { repo, issueTitle, issueBody } = req.body;
  if (!repo || !issueTitle || !issueBody) {
    return res.status(400).json({ error: "Missing required fields: repo, issueTitle, issueBody" });
  }
  try {
    const result = await handleIssue(repo, issueTitle, issueBody);
    res.json({ results: result });
  } catch (e) {
    console.error(`[Analyze Error] Repo: ${repo}`, e.message, e.stack);
    res.status(500).json({ error: `Failed to analyze issue: ${e.message}` });
  }
});

// GET /list-docs: List stored documents in ChromaDB
app.get("/list-docs", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await listDocuments(page, limit);
    res.json(result);
  } catch (e) {
    console.error("[List Docs Error]", e.message, e.stack);
    res.status(500).json({ error: `Failed to list documents: ${e.message}` });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));