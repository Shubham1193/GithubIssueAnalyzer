import { ChromaClient } from "chromadb";
import dotenv from "dotenv";

dotenv.config();

// Initialize ChromaDB client with explicit tenant and database
const client = new ChromaClient({
  path: `${process.env.CHROMA_HOST}:${process.env.CHROMA_PORT}`,
});

// Create or get the collection with error handling
let collectionPromise;
try {
  collectionPromise = client.getOrCreateCollection({ name: "repo-help" });
} catch (err) {
  console.error("[ChromaDB Init Error] Failed to initialize collection:", err.message);
  throw err;
}
// 
export async function getExistingIdsForRepo(repo) {
  try {
    const collection = await collectionPromise;
    console.log(`[GetExistingIdsForRepo] Querying IDs for repo: ${repo}`);
    // will retirn every thing
    const result = await collection.get({
      where: { repo: { $eq: repo } },
      // include: ["ids"],
    });
    const existingIds = result.ids || [];
    console.log(`[GetExistingIdsForRepo] Found ${existingIds.length} existing IDs for repo: ${repo}`);
    return existingIds;
  } catch (err) {
    console.error(`[GetExistingIdsForRepo Error] Repo: ${repo}`, err.message);
    if (err.message.includes("could not be found")) {
      return [];
    }
    throw err;
  }
}



// List stored documents with pagination
export async function listDocuments(page = 1, limit = 20) {
  try {
    const collection = await collectionPromise;
    console.log(`[ListDocuments] Listing documents, page: ${page}, limit: ${limit}`);
    const result = await collection.get({
      limit,
      offset: (page - 1) * limit,
      include: ["metadatas", "documents", "embeddings"],
    });

    return {
      documents: result.ids.map((id, i) => ({
        id,
        file: result.metadatas[i]?.file || "unknown",
        repo: result.metadatas[i]?.repo || "unknown",
        summary: result.documents[i] || "No summary",
        embedding: result.embeddings[i]?.slice(0, 10) || [],
      })),
      total: result.ids.length,
      page,
      limit,
    };
  } catch (err) {
    console.error("[ListDocuments Error]", err.message);
    if (err.message.includes("could not be found")) {
      return { documents: [], total: 0, page, limit };
    }
    throw err;
  }
}

// Store embeddings in ChromaDB
export async function storeEmbeddings(docs) {
  try {
    const collection = await collectionPromise;
    console.log(`[StoreEmbeddings] Preparing to store ${docs.length} documents`);

    // Validate and filter valid documents
    const validDocs = docs.filter((d) => {
      if (!Array.isArray(d.embedding) || d.embedding.length === 0) {
        console.warn(`[StoreEmbeddings] Skipping invalid embedding for ${d.file}`);
        return false;
      }
      return true;
    });

    if (validDocs.length === 0) {
      console.log("[StoreEmbeddings] No valid documents to store");
      return;
    }

    // Build document data
    const ids = validDocs.map((d) => `${d.repo}::${d.file}`);
    const metadatas = validDocs.map((d) => ({ file: d.file, repo: d.repo }));
    const documents = validDocs.map((d) => d.chunk);
    const embeddings = validDocs.map((d) => d.embedding);

    // Check existing IDs to avoid duplicates
    let existingIds = [];
    try {
      const existing = await collection.get({ ids });
      existingIds = existing.ids || [];
      console.log(`[StoreEmbeddings] Found ${existingIds.length} existing documents`);
    } catch (err) {
      console.warn("[StoreEmbeddings] Failed to fetch existing IDs, proceeding to add all documents:", err.message);
      // Continue with all documents if get fails
      existingIds = [];
    }

    // Filter out documents that already exist
    const toAdd = validDocs
      .map((doc, i) => ({
        id: ids[i],
        chunk: documents[i],
        meta: metadatas[i],
        emb: embeddings[i],
      }))
      .filter((_, i) => !existingIds.includes(ids[i]));

    if (toAdd.length === 0) {
      console.log("[StoreEmbeddings] All documents already exist, no new documents to add");
      return;
    }

    // Add new documents to ChromaDB
    console.log(`[StoreEmbeddings] Adding ${toAdd.length} new documents`);
    await collection.add({
      ids: toAdd.map((x) => x.id),
      documents: toAdd.map((x) => x.chunk),
      metadatas: toAdd.map((x) => x.meta),
      embeddings: toAdd.map((x) => x.emb),
    });
    console.log(`[StoreEmbeddings] Successfully added ${toAdd.length} documents`);
  } catch (err) {
    console.error("[StoreEmbeddings Error]", err.message, err.stack);
    throw err;
  }
}

// Search for similar documents
export async function searchSimilar(queryEmbedding, repo, topK = 3) {
  try {
    const collection = await collectionPromise;
    console.log(`[SearchSimilar] Searching for similar docs in repo: ${repo}, topK: ${topK}`);
    const result = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      where: { repo },
      distanceMetric : 'cosine'
    });

    if (!result.documents?.[0]?.length) {
      console.log("[SearchSimilar] No similar documents found");
      return [];
    }

    console.log(`[SearchSimilar] Found ${result.documents[0].length} similar documents`);
    return result.documents[0].map((doc, i) => ({
      file: result.metadatas[0][i].file,
      repo: result.metadatas[0][i].repo,
      match: doc.slice(0, 400),
    }));
  } catch (err) {
    console.error("[SearchSimilar Error]", err.message);
    throw err;
  }
}