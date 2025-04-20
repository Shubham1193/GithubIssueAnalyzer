import axios from "axios";


// -------------------------------------------------------------------------------------------------------------------------//


export async function getRepoFiles(owner, repo) {
  const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`);
  return res.data.tree
    .filter(f => f.type === "blob" && f.path.match(/\.(js|ts|jsx|tsx|py|md)$/))
    .map(f => f.path);
}


// -------------------------------------------------------------------------------------------------------------------------//


export async function getFileContent(owner, repo, filePath) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
  const res = await axios.get(url);
 
  return res.data;
}
