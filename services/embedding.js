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
    - Class name or funtion name whichever is more relevant
    - Detailed explanation of what the funtion or class does
    - Inputs and outputs
    - Class code or funtion code which ever is more important 
  - Separate each Class or function's summary with the identifier "---".
  - Seperate each class or funtion's summary and code with identifier "***" and code should be at the end of summary
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

async function queryExpansion(userQuery) {
  const prompt = `
  You are an intelligent assistant designed to enhance user search queries. Given the following user query, generate:
  - An expanded version of the query with more detail or clarification.
  - A list of 3 to 5 related or alternative queries that a user might also search for.
  
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
  
  // Fetch all existing IDs for this repository
  const existingIds = await getExistingIdsForRepo(normalizedRepoSlug);
  console.log(existingIds);
  
  const files = await getRepoFiles(owner, repo);
  console.log(files)
  const docs = [];

  for (let file of files) {
    const fileIdPrefix = `${normalizedRepoSlug}::${file}`;
    if (existingIds.some(id => id.startsWith(fileIdPrefix))) {
      console.log(`[HandleIssue] Skipping cached document(s) for ${file}`);
      // Skip processing if any part of this file is already cached
    } else {
      console.log(`[HandleIssue] Processing new file: ${file}`);
      try {
        const raw = await getFileContent(owner, repo, file);
        const summary = await summarizeCode(raw);
        // console.log(summary)
        
        // Split summary into chunks based on --- delimiter
        const summaryChunks = summary.split("---").map(chunk => chunk.trim()).filter(chunk => chunk);
        if (summaryChunks.length === 0) {
          console.warn(`[HandleIssue Warning] No valid summary chunks for ${file}`);
          continue;
        }

        // Process each chunk (file-level summary and function-level summaries)
        for (let i = 0; i < summaryChunks.length; i++) {
          const chunk = summaryChunks[i];
          const chunkId = i === 0 ? `${fileIdPrefix}::file` : `${fileIdPrefix}::func${i}`;
          // console.log("chunk" + chunk)
        
          if (existingIds.includes(chunkId)) {
            console.log(`[HandleIssue] Skipping cached chunk ${chunkId}`);
            continue;
          }
        
          // Extract code at the end of the chunk (after last "---")
          let summaryOnly = "";
          let functionCode = "";
        
          const parts = chunk.split("***").map(part => part.trim()).filter(part => part);
          console.log(parts)
          if (parts.length > 1) {
            // Last part is the code, rest is the summary
            functionCode = parts[parts.length - 1];
            summaryOnly = parts.slice(0, parts.length - 1).join("\n---\n");
            
          }
          console.log("summary +++++++++++++" +summaryOnly)
          console.log("code +++++++++++++" + functionCode)
          const embedding = await createEmbedding(summaryOnly);
        
          docs.push({
            file,
            repo: normalizedRepoSlug,
            chunk: summaryOnly,
            code: functionCode,
            embedding,
            docId: chunkId
          })      
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
  const expandedQuery = await queryExpansion(queryText)
  const queryEmbedding = await createEmbedding(expandedQuery);
  const results = await searchSimilar(queryEmbedding, normalizedRepoSlug);

  if (!results?.length) {
    throw new Error("No matching documents found.");
  }

  return results.map(({ file, match }) => ({
    file,
    match,
  }));
}