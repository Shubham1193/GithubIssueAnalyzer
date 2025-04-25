import { getExistingIdsForRepo, storeEmbeddings, searchSimilar } from '../vector-store/chromadb.js';
import { getRepoFiles, getFileContent } from '../utils/github.js';

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import pLimit from 'p-limit'

const CONCURRENCY =10 ; 


dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const codeModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

// Summarize code file content
async function summarizeCode(fileContent) {
  const prompt = `
  You are a fast, high-level summarizer for large codebases. Summarize the following file for quick retrieval:
  - A 2 to 3 line summary of what this file does
  - List of top-level functions or classes with 10 line desciption descriptions
  - Mention any error-related keywords, exception handling, or logging
  Keep the summary concise. No need to include full code blocks.
  \`\`\`js
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

async function queryExpansion(userQuery) {
  const prompt = `
  You are an intelligent assistant designed to enhance user search queries. Given the following user query, generate:
  - An expanded version of the query with more detail or clarification.
  
  Query: "${userQuery}"
  `;
  try {
    const result = await codeModel.generateContent(prompt);
    const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No expansion text found in model response.");
    }
    // console.log("[QueryExpansion] Generated expansion for query:", userQuery);
    return text;
  } catch (err) {
    console.error("[QueryExpansion Error]", err.message);
    return "Error: Could not generate query expansion.";
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

  const existingIds = await getExistingIdsForRepo(normalizedRepoSlug);
  const files = await getRepoFiles(owner, repo);

  const docs = [];
  const limit = pLimit(CONCURRENCY);

  const tasks = files.map(file => limit(async () => {
    const fileIdPrefix = `${normalizedRepoSlug}::${file}`;
    if (existingIds.some(id => id.startsWith(fileIdPrefix))) {
      console.log(`[HandleIssue] Skipping cached document(s) for ${file}`);
      return;
    }

    console.log(`[HandleIssue] Processing new file: ${file}`);
    try {
      const raw = await getFileContent(owner, repo, file);
      const summary = await summarizeCode(raw);
      const embedding = await createEmbedding(summary);

      docs.push({
        file,
        repo: normalizedRepoSlug,
        chunk: summary,
        embedding,
        docId: fileIdPrefix
      });
    } catch (e) {
      console.error(`[HandleIssue Error] File: ${file}`, e.message);
    }
  }));

  await Promise.allSettled(tasks);

  if (docs.length > 0) {
    console.log(`[HandleIssue] Storing ${docs.length} new documents`);
    await storeEmbeddings(docs);
  } else {
    console.log(`[HandleIssue] No new documents to store`);
  }

  const queryText = `${title}\n${body}`;
  const expandedQuery = await queryExpansion(queryText);
  console.log(expandedQuery)
  const queryEmbedding = await createEmbedding(expandedQuery)
  const results = await searchSimilar(queryEmbedding, normalizedRepoSlug);

  if (!results?.length) {
    throw new Error("No matching documents found.");
  }

  return results.map(({ file, match }) => ({
    file,
    match,
  }));
}