# 📜 Story Scribe

Story Scribe is a cutting-edge, AI-powered web application designed to capture, analyze, and beautifully preserve life stories. It transforms raw interviews, transcripts, and personal documents into rich, multimedia experiences.

![Story Scribe Screenshot](https://storage.googleapis.com/aistudio-project-showcase/story-scribe-screenshot.png) <!-- Placeholder Image -->

---

## ✨ Core Features

*   **🎙️ AI-Powered Interviewing:** "Connie," our conversational AI, guides users through natural, empathetic interviews to capture stories verbally.
*   **🪄 Magic Cascade Analysis:** A one-click, multi-agent AI workflow that analyzes transcripts, extracts key data (timelines, people, themes), writes a compelling narrative, generates relevant images, and structures a presentation.
*   **✍️ The Story Studio:** An interactive workspace to review and refine every aspect of the created story.
*   **🎨 Creative Asset Generation:** Generate images, video scenes, audio narration, and presentations from your story data.
*   **📚 Multiple Viewing Experiences:** View the final product as an interactive Storybook, a cinematic Director's Cut, or a formal Presentation.
*   **🗄️ Searchable Story Archive:** Save and manage all created stories in a local, persistent archive.
*   **🔗 Connection Finder:** Discover common people, places, and themes across different stories in the archive.
*   **🌐 Share & Export:** Share stories via a public link and QR code, or export as a PDF or GEDCOM file.

---

## 💻 Tech Stack

*   **Framework:** React 19 (Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **AI:** Google Gemini API
    *   `gemini-2.5-flash` / `gemini-2.5-pro` (Text & Analysis)
    *   `imagen-4.0-generate-001` (Image Generation)
    *   `veo-3.1-fast-generate-preview` (Video Generation)
    *   `gemini-2.5-flash-preview-tts` (Text-to-Speech)
    *   `gemini-2.5-flash-native-audio-preview-09-2025` (Live Conversational AI)
*   **Backend:** Python (FastAPI) hosted on Google Cloud Run.
*   **Local Storage:** Browser `localStorage` is used for the story archive and user settings.
*   **Offline Support:** A Service Worker (`sw.js`) provides basic offline caching for the application shell and key assets.

---

## 🚀 Getting Started

This project is a single-page application built with React and Vite. It interacts with a separate backend service for all AI-related processing.

### Prerequisites

*   A modern web browser (e.g., Chrome, Firefox, Safari).
*   An internet connection to communicate with the backend API.

### Environment Variables

The application requires an API key for the Gemini API. As per project guidelines, this key is expected to be available in the execution environment as `process.env.API_KEY`.

**Note:** The application is designed to run in an environment (like Google AI Studio) where this variable is automatically and securely injected. There is no UI for users to enter their own API key.

---

## 📁 Project Structure

```
.
├── components/         # Reusable React components
│   ├── icons/          # SVG icon components
│   ├── ConnieChatWidget.tsx # The AI interviewer
│   ├── NewStoryPanel.tsx    # Main panel for creating a new story
│   ├── StorybookViewer.tsx  # Viewer for the final storybook
│   └── ...
├── services/           # Modules for interacting with APIs and local storage
│   ├── api.ts          # Main service for backend communication
│   ├── archiveService.ts # Manages the local storage archive
│   └── ...
├── utils/              # Helper functions (file processing, exports, etc.)
│   ├── storybookUtils.ts # Logic for generating and exporting storybooks
│   └── ...
├── App.tsx             # Main application component, manages state and views
├── index.tsx           # Entry point for the React application
├── index.html          # The main HTML file
└── README.md           # This file
```

---

## 💡 Suggestions for Improvement

*   **Cloud-Based Archive:** Migrate the `archiveService` from `localStorage` to a cloud database (like Firestore) to allow users to access their stories across different devices and browsers.
*   **Real-time Collaboration:** Implement features to allow multiple family members to collaborate on a single story.
*   **Enhanced Media Editing:** Add tools for cropping images, trimming audio clips, and adding captions to video scenes directly within the Story Studio.
*   **Advanced Genealogy Integration:** Expand the GEDCOM export to include more relational data (parents, spouses, children) if it can be reliably extracted from the narrative.
