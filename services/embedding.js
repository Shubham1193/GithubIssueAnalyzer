import { getExistingIdsForRepo, storeEmbeddings, searchSimilar } from '../vector-store/chromadb.js';
import { getRepoFiles, getFileContent } from '../utils/github.js';

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const codeModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

// Summarize code file content
async function summarizeCode(fileContent) {
  const prompt = `
  You are an expert software assistant. Read the following code and generate a clear summary of:
  - What feature(s) it implements
  - What things can be a added in this page and what user does and what backend does with this code 
  - Which functions are present and what each function does
  - Mention which page it belongs to if obvious
  
  Respond in bullet points.
  
  \`\`\`
  ${fileContent}
  \`\`\`
  `;
  try {
    const result = await codeModel.generateContent(prompt);
    const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No summary text found in model response.");
    }
    console.log("[SummarizeCode] Generated summary for content length:", fileContent.length);
    return text;
  } catch (err) {
    console.error("[SummarizeCode Error]", err.message);
    return "Error: Could not generate summary.";
  }
}

// Create embedding for text
export async function createEmbedding(text) {
  try {
    const result = await embeddingModel.embedContent({
      content: { parts: [{ text }] },
    });
    console.log("[CreateEmbedding] Generated embedding for text length:", text.length);
    return result.embedding.values;
  } catch (err) {
    console.error("[CreateEmbedding Error]", err.message);
    throw err;
  }
}

export async function handleIssue(repoSlug, title, body) {
  const [owner, repo] = repoSlug.split("/");
  const normalizedRepoSlug = `${owner}/${repo}`;
  console.log(`[HandleIssue] Processing issue for repo: ${normalizedRepoSlug}`);
  
  // Fetch all existing IDs for this repository
  const existingIds = await getExistingIdsForRepo(normalizedRepoSlug);
  console.log(existingIds)
  
  const files = await getRepoFiles(owner, repo);
  const docs = [];

  for (let file of files.slice(0, 10)) {
    const docId = `${normalizedRepoSlug}::${file}`;
    if (existingIds.includes(docId)) {
      console.log(`[HandleIssue] Skipping cached document for ${file}`);
      // No need to process or add to docs; searchSimilar will use ChromaDB data
    } else {
      console.log(`[HandleIssue] Processing new file: ${file}`);
      try {
        const raw = await getFileContent(owner, repo, file);
        const summary = await summarizeCode(raw);
        const embedding = await createEmbedding(summary);
        docs.push({ file, repo: normalizedRepoSlug, chunk: summary, embedding });
      } catch (e) {
        console.error(`[HandleIssue Error] File: ${file}`, e.message);
      }
    }
  }

  // Store only new documents
  if (docs.length > 0) {
    console.log(`[HandleIssue] Storing ${docs.length} new documents`);
    await storeEmbeddings(docs);
  } else {
    console.log(`[HandleIssue] No new documents to store`);
  }

  const queryText = `${title}\n${body}`;
  const queryEmbedding = await createEmbedding(queryText);
  const results = await searchSimilar(queryEmbedding, normalizedRepoSlug);

  if (!results?.length) {
    throw new Error("No matching documents found.");
  }

  return results.map(({ file, match }) => ({
    file,
    match,
  }));
}