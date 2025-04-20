// const { ChromaClient } = require('chromadb');

// const client = new ChromaClient({
//   path: 'http://localhost:8000', // Replace with your Chroma server URL
// });


// // async function listCollections() {
// //     const collections = await client.listCollections();
// //     console.log('Collections:', collections);
// //   }
  
// //   listCollections();

// // async function getCollection(collectionName) {
// //     const collection = await client.getCollection({ name: collectionName });
// //     return collection;
// //   }
  
  
// // async function fetchDocuments(collectionName) {
// //     const collection = await getCollection(collectionName);
// //     const results = await collection.get();
// //     console.log('Documents:', results.documents);
// //     console.log('Metadata:', results.metadatas);
// //   }
  
// //   fetchDocuments('repo-help'); // Replace with your collection name
  
// //   async function fetchEmbeddings(collectionName) {
// //     const collection = await getCollection(collectionName);
// //     const results = await collection.get();
// //     console.log('Embeddings:', results.embeddings);
// //   }
  
// //   fetchEmbeddings('repo-help'); // Replace with your collection name

const { ChromaClient } = require('chromadb');

(async () => {
  const client = new ChromaClient({ path: 'http://localhost:8000' });

  const collectionName = 'repo-help'; // replace with your collection name

  await client.deleteCollection({ name: collectionName });

  console.log(`Collection '${collectionName}' deleted successfully.`);
})();


// // import { ChromaClient } from "chromadb";
// // import dotenv from "dotenv";
// // dotenv.config();

// // const client = new ChromaClient({
// //     path: 'http://localhost:8000', 
// // });

// async function test() {
//   const collection = await client.getOrCreateCollection({ name: "test-collection" });
//   await collection.add({
//     ids: ["test1"],
//     documents: ["This is a test"],
//     metadatas: [{ file: "test.txt" }],
//     embeddings: [[0.1, 0.2, 0.3]]
//   });
//   console.log("Added test document");
//   const result = await collection.get({
   
//   });
//   console.log("Retrieved IDs:", result.ids);
// }

// test().catch(console.error);