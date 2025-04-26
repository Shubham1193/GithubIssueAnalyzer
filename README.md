# 🚀 Code Issue Context

![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-red)
![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)

**Code Issue Context** is a lightweight Chrome browser extension designed to streamline developer workflows by mapping GitHub issues directly to relevant parts of your codebase. By reducing context switching, it enhances productivity and keeps you focused on coding.

When browsing code on GitHub, the extension highlights files, functions, and code blocks associated with open issues, providing instant context without the need to navigate multiple threads or tabs.

## ✨ Features

- 🔍 **Visual Indicators**: Issue markers are displayed directly in your GitHub code view for quick identification.
- 📝 **Quick Issue Access**: View issue details, comments, and status in a non-intrusive overlay without leaving the page.
- 🧠 **Smart Matching**: Automatically links GitHub issues to relevant functions, classes, and files using intelligent code analysis.
- 🪶 **Lightweight UI**: Minimal, seamless integration into GitHub's interface for a distraction-free experience.
- ⚡ **Fast Performance**: Optimized for speed, ensuring no lag in your browsing experience.
- 🔒 **Secure**: No data is stored externally; all processing is done locally or via your private backend.

## 🛠️ Getting Started

### Prerequisites
- [Docker](https://www.docker.com/get-started) installed for running the vector database.
- [Node.js](https://nodejs.org/) (v16 or higher) for the backend.
- A GitHub account with access to the repositories you want to use.

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/code-issue-context.git
   cd code-issue-context
   ```

2. **Start the Vector Database**  
   The extension uses a Chroma vector database to store and query code-issue mappings.
   ```bash
   docker run -d -p 8000:8000 -v chroma_data:/chroma/.chroma ghcr.io/chroma-core/chroma:latest
   ```

3. **Set Up the Backend**  
   The Node.js backend handles issue-code matching and communication with the vector database.
   ```bash
   npm install
   node app.js
   ```
   Ensure the backend is running on http://localhost:3000 (default).

4. **Install the Chrome Extension**
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable Developer mode (toggle in the top-right corner).
   - Click Load unpacked and select the extension folder from the cloned repository.
   - The extension should now appear in your Chrome toolbar.

5. **Configure the Extension**
   - Click the extension icon in Chrome and enter your GitHub repository URL.
   - Optionally, provide a GitHub Personal Access Token for private repositories (see GitHub's guide).
   - Ensure the backend URL is set to http://localhost:3000 (or your custom URL if deployed).

## 📖 Usage

- Open any code file in a GitHub repository.
- The extension will automatically highlight code blocks linked to open issues.
- Hover over a highlighted section to view issue details (title, status, assignee, etc.).
- Click the issue marker to open a sidebar with full issue details, comments, and a link to the GitHub issue page.

## 🛠️ Development



### Running in Development Mode
- **Backend**: Run `npm run dev` to start the backend with hot reloading (requires nodemon).
- **Extension**: Load the extension folder in Chrome as an unpacked extension. Changes to extension files are reflected on browser refresh.
- **Vector DB**: Ensure the Docker container is running (`docker ps` to verify).


## 🤝 Contributing

We welcome contributions! To get started:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Make your changes and commit (`git commit -m "Add your feature"`).
4. Push to your fork (`git push origin feature/your-feature`).
5. Open a pull request with a clear description of your changes.






## 🌟 Acknowledgments

- Chroma for the vector database.
- Node.js for the robust backend.
- GitHub API for seamless integration.
- All contributors and users who make this project better every day!
