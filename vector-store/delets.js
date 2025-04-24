import { ChromaClient } from "chromadb";

(async () => {
  const client = new ChromaClient({ path: 'http://localhost:8000' });

  const collectionName = 'repo-help'; // replace with your collection name

  await client.deleteCollection({ name: collectionName });

  console.log(`Collection '${collectionName}' deleted successfully.`);
})();