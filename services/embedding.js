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
  You are an expert software assistant. Read the following code and generate:
  - A brief summary of the overall file, including the feature(s) it implements and the page/module it likely belongs to.
  - For each function in the code, provide:
    - Function name
    - Detailed explanation of what the function does
    - Inputs and outputs
  - Separate each function's summary with the identifier "---".
  - If no functions are present, provide only the file-level summary.
  
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
    if (text.includes("---") && text.split("---").length < 2) {
      console.warn("[SummarizeCode Warning] Summary contains separator but no function-level summaries.");
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
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await embeddingModel.embedContent({
        content: { parts: [{ text }] },
      });
      console.log("[CreateEmbedding] Generated embedding for text length:", text.length);
      return result.embedding.values;
    } catch (err) {
      console.error(`[CreateEmbedding Error] Attempt ${attempt}:`, err.message);
      if (attempt === maxRetries) throw new Error(`Failed to create embedding after ${maxRetries} attempts: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}


export async function handleIssue(repoSlug, title, body) {
  const [owner, repo] = repoSlug.split("/");
  const normalizedRepoSlug = `${owner}/${repo}`;
  console.log(`[HandleIssue] Processing issue for repo: ${normalizedRepoSlug}`);
  
  // Fetch all existing IDs for this repository
  const existingIds = await getExistingIdsForRepo(normalizedRepoSlug);
  console.log(existingIds);
  
  const files = await getRepoFiles(owner, repo);
  const docs = [];

  for (let file of files.slice(0, 10)) {
    const fileIdPrefix = `${normalizedRepoSlug}::${file}`;
    if (existingIds.some(id => id.startsWith(fileIdPrefix))) {
      console.log(`[HandleIssue] Skipping cached document(s) for ${file}`);
      // Skip processing if any part of this file is already cached
    } else {
      console.log(`[HandleIssue] Processing new file: ${file}`);
      try {
        const raw = await getFileContent(owner, repo, file);
        const summary = await summarizeCode(raw);
        
        // Split summary into chunks based on --- delimiter
        const summaryChunks = summary.split("---").map(chunk => chunk.trim()).filter(chunk => chunk);
        if (summaryChunks.length === 0) {
          console.warn(`[HandleIssue Warning] No valid summary chunks for ${file}`);
          continue;
        }

        // Process each chunk (file-level summary and function-level summaries)
        for (let i = 0; i < summaryChunks.length; i++) {
          const chunk = summaryChunks[i];
          // Create a unique docId for each chunk
          const chunkId = i === 0 ? `${fileIdPrefix}::file` : `${fileIdPrefix}::func${i}`;
          
          if (existingIds.includes(chunkId)) {
            console.log(`[HandleIssue] Skipping cached chunk ${chunkId}`);
            continue;
          }

          const embedding = await createEmbedding(chunk);
          docs.push({
            file,
            repo: normalizedRepoSlug,
            chunk,
            embedding,
            docId: chunkId // Include docId for storage
          });
        }
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