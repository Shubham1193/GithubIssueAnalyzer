🚀 Code Issue Context

Code Issue Context is a lightweight Chrome browser extension designed to streamline developer workflows by mapping GitHub issues directly to relevant parts of your codebase. By reducing context switching, it enhances productivity and keeps you focused on coding.
When browsing code on GitHub, the extension highlights files, functions, and code blocks associated with open issues, providing instant context without the need to navigate multiple threads or tabs.

✨ Features

🔍 Visual Indicators: Issue markers are displayed directly in your GitHub code view for quick identification.
📝 Quick Issue Access: View issue details, comments, and status in a non-intrusive overlay without leaving the page.
🧠 Smart Matching: Automatically links GitHub issues to relevant functions, classes, and files using intelligent code analysis.
🪶 Lightweight UI: Minimal, seamless integration into GitHub’s interface for a distraction-free experience.
⚡ Fast Performance: Optimized for speed, ensuring no lag in your browsing experience.
🔒 Secure: No data is stored externally; all processing is done locally or via your private backend.


🛠️ Getting Started
Prerequisites

Docker installed for running the vector database.
Node.js (v16 or higher) for the backend.
Google Chrome for the extension.
A GitHub account with access to the repositories you want to use.

Installation

Clone the Repository
git clone https://github.com/your-username/code-issue-context.git
cd code-issue-context


Start the Vector DatabaseThe extension uses a Chroma vector database to store and query code-issue mappings.
docker run -d -p 8000:8000 -v chroma_data:/chroma/.chroma ghcr.io/chroma-core/chroma:latest


Set Up the BackendThe Node.js backend handles issue-code matching and communication with the vector database.
npm install
node app.js

Ensure the backend is running on http://localhost:3000 (default).

Install the Chrome Extension

Open Chrome and navigate to chrome://extensions/.
Enable Developer mode (toggle in the top-right corner).
Click Load unpacked and select the extension folder from the cloned repository.
The extension should now appear in your Chrome toolbar.


Configure the Extension

Click the extension icon in Chrome and enter your GitHub repository URL.
Optionally, provide a GitHub Personal Access Token for private repositories (see GitHub's guide).
Ensure the backend URL is set to http://localhost:3000 (or your custom URL if deployed).




📖 Usage

Open any code file in a GitHub repository.
The extension will automatically highlight code blocks linked to open issues.
Hover over a highlighted section to view issue details (title, status, assignee, etc.).
Click the issue marker to open a sidebar with full issue details, comments, and a link to the GitHub issue page.


🛠️ Development
Project Structure
code-issue-context/
├── extension/          # Chrome extension source (manifest.json, JS, CSS)
├── backend/            # Node.js backend (app.js, API routes)
├── chroma_data/        # Volume for Chroma vector DB (auto-created by Docker)
├── README.md           # This file
└── package.json        # Backend dependencies

Running in Development Mode

Backend: Run npm run dev to start the backend with hot reloading (requires nodemon).
Extension: Load the extension folder in Chrome as an unpacked extension. Changes to extension files are reflected on browser refresh.
Vector DB: Ensure the Docker container is running (docker ps to verify).

Testing

Run npm test in the backend directory to execute unit tests (uses Jest).
For extension testing, manually test in Chrome or use a tool like Puppeteer.


🤝 Contributing
We welcome contributions! To get started:

Fork the repository.
Create a new branch (git checkout -b feature/your-feature).
Make your changes and commit (git commit -m "Add your feature").
Push to your fork (git push origin feature/your-feature).
Open a pull request with a clear description of your changes.

Please read our Contributing Guidelines for more details.


🙋‍♂️ Support
If you encounter issues or have questions:

Check the FAQ for common solutions.
Open an issue on the GitHub repository.
Reach out to the community on our Discussions page.


🌟 Acknowledgments

Chroma for the vector database.
Node.js for the robust backend.
GitHub API for seamless integration.
All contributors and users who make this project better every day!

