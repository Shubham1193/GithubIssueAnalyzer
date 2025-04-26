# 🚀 Code Issue Context

![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-red)
![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)

**Code Issue Context** is a lightweight browser extension that maps GitHub issues directly to relevant parts of your codebase, enhancing developer productivity by reducing context switching.

When you're browsing your code on GitHub, the extension highlights the files, functions, and blocks associated with open issues — so you can instantly understand what parts of your implementation are impacted without digging through multiple threads or tabs.

---

## ✨ Features

- 🔍 **Visual Indicators**: See issue markers directly in your code.
- 📝 **Quick Issue Access**: View issue details, comments, and status without leaving the page.
- 🧠 **Smart Matching**: Automatically links GitHub issues to related code functions, classes, and files.
- 🪶 **Lightweight UI**: Non-intrusive, minimal interface that fits seamlessly into GitHub.

---

## 🛠️ Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/code-issue-context.git
cd code-issue-context

docker run -d -p 8000:8000 -v chroma_data:/chroma/.chroma ghcr.io/chroma-core/chroma:latest
