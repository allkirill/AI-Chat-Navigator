# AI-Chat-Navigator 🧭
A universal browser extension to fix the most annoying AI chat problems: uncontrolled auto-scrolling and lack of navigation.

Tired of the chat jumping to the bottom while the AI is generating an answer? Tired of scrolling through endless walls of text to find your previous question?

AI Chat Navigator adds a "Table of Contents" to your chat and gives you full control over scrolling.

Demo GIF

✨ Features
📋 Chat Table of Contents: Automatically creates a list of your messages. Click to instantly jump to any part of the conversation.
🛑 Smart Auto-Scroll Block: The page stays where you want it. No more fighting with the chat interface while reading.
🌍 Universal Support: Works with ChatGPT, Gemini, Qwen, DeepSeek, Claude, and others. No hard-coded selectors used.
🌓 Dark & Light Theme: Matches your preference.
💾 Local History: Keeps a log of your chats locally for quick access.
🚀 Installation
Option 1: Chrome Web Store (Recommended)
(Coming soon!)

Option 2: Load Manually (Developer Mode)
Download this repository (Code -> Download ZIP) and unzip it.
Open Google Chrome and go to chrome://extensions/.
Enable Developer mode (top right toggle).
Click Load unpacked.
Select the unzipped folder.
Important: Refresh any open AI chat tabs to activate.
⚙️ How it works
Instead of relying on specific HTML classes that break every week, this extension uses a heuristic approach:

Detects your Enter key press.
Scans the DOM for your text content.
Anchors the message in the navigation panel.
🤝 Contributing
Found a bug or want to improve the UI? Feel free to open an Issue or Pull Request!

📜 License
MIT License.
