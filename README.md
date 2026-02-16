# InsightTube

**Turn any YouTube video into an interactive learning experience.** InsightTube is a desktop app that extracts transcripts from YouTube videos and uses AI to generate study materials, quizzes, mind maps, flashcards, and more — all offline-capable and privacy-first.

*This is a submission for the [GitHub Copilot CLI Challenge](https://dev.to/challenges/github-2026-01-21)*

## What I Built

InsightTube is a cross-platform desktop application built with **Tauri v2 + React 19 + TypeScript** that transforms passive YouTube watching into active learning. Paste any YouTube video URL and the app automatically fetches the transcript (using a Rust backend to bypass 403 restrictions), then lets you generate a full suite of AI-powered study materials.

### Features

- **AI-Powered Study Materials** — Summaries, study guides, flashcards, and interactive mind maps (powered by markmap) generated from any video's transcript
- **Quiz Generation** — Configurable multiple-choice quizzes with adjustable question count, shuffled options, explanations, quiz versioning, and full quiz history with retake support
- **AI Chat Interface** — Chat with AI about the video content with full transcript context, SSE streaming responses, persistent chat sessions, chat history sidebar, and new chat support
- **Mind Maps** — Interactive, zoomable mind map visualizations with fullscreen mode using markmap
- **Flashcards** — Flip-card study tool generated from video content
- **Dashboard** — Overview with stats, LeetCode-style activity calendar (GitHub contribution graph style), recent sessions, and streak tracking
- **Video History** — Browse, search, and manage all processed videos with thumbnails
- **Transcription Tab** — View and copy the raw transcript with one click
- **Notes** — Create and manage notes globally or per-video, with rich editing
- **Todos & Reminders** — Task management with reminders, linked to video sessions
- **Multi-Provider AI** — Switch between OpenAI (GPT-4.1, GPT-4o, etc.) and Google Gemini (2.5 Flash, 2.5 Pro, etc.) with dynamic model listing
- **Model Selector** — Browse and select from all available models fetched live from your API
- **Persistent Storage** — All data saved locally via Tauri's secure store plugin — no cloud, no accounts
- **Rust Backend** — Custom Rust transcript fetcher that bypasses YouTube 403 errors that plague browser-based solutions
- **Modern UI** — Dark theme with smooth animations, responsive layout, and clean design

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Tauri v2 (Rust backend) |
| Frontend | React 19.1 + TypeScript 5.8 |
| Build Tool | Vite 7 |
| Routing | React Router 7.13 |
| AI (OpenAI) | openai SDK v6.22 |
| AI (Gemini) | @google/genai v1.41 |
| Mind Maps | markmap-lib + markmap-view |
| Markdown | marked v17 |
| Icons | lucide-react v0.564 |
| Storage | @tauri-apps/plugin-store v2.4 |
| HTTP | @tauri-apps/plugin-http v2.5 |

## Demo

**GitHub Repository:** [https://github.com/Mandy324/insightTube](https://github.com/Mandy324/insightTube)


## My Experience with GitHub Copilot CLI

Building InsightTube was almost entirely driven by **GitHub Copilot CLI** (the Copilot agent mode in VS Code). My workflow was remarkably different from the traditional coding experience — I would define what I wanted, and Copilot CLI handled the entire development process autonomously.

### How it changed my workflow

With the regular VS Code GitHub Copilot extension, I'd constantly need to interact — write a prompt, review the suggestion, accept or tweak it, write another prompt, and repeat. It's helpful but still very hands-on. **Copilot CLI was a completely different experience.** I would describe a feature at a high level, and it would:

1. **Break the task into subtasks automatically** — it would create a structured todo list, plan the implementation order, identify dependencies between steps
2. **Research the codebase first** — before writing any code, it would read relevant files, understand the existing patterns, and figure out where changes needed to go
3. **Implement across multiple files** — a single feature request would result in coordinated changes across types, services, components, and CSS — all in one go
4. **Verify its own work** — after implementing, it would run `tsc --noEmit` and `vite build` to catch errors, then fix them before handing back to me

### Real examples from this project

- **"Add SSE streaming to the chat interface and add chat history"** — Copilot CLI created a 7-step plan, added the `ChatSession` type, wrote storage CRUD functions, implemented a streaming `streamChatWithVideo()` function for both OpenAI and Gemini, rewired the React state management with `AbortController` support, built the chat history sidebar UI, added all the CSS, and verified the build — all from a single prompt.

- **"Add a LeetCode-style activity calendar to the dashboard"** — It researched how the existing stats were calculated, built the full calendar grid component with month labels, color-coded intensity levels, tooltips, and responsive layout — then fixed timezone bugs and alignment issues across multiple iterations.

- **"The chat UI looks bad, make it look like this"** — I pasted a reference screenshot, and Copilot CLI completely revamped the message layout from bubble-style to a clean label-based design with `● YOU` / `● AI` badges, removed card backgrounds, and updated all the CSS to match.

### Time saved

This project has **9 pages, 5 reusable components, 3 service layers, a full type system, and a Rust backend** — and it was built in a fraction of the time it would normally take. The biggest time-saver was not having to context-switch between thinking about architecture and writing code. I'd define what I wanted, Copilot CLI would plan and execute, and I'd review the result. It genuinely felt like pair programming with a senior engineer who never gets tired.

### The bottom line

Copilot CLI didn't just autocomplete lines — it **understood the project holistically** and made architectural decisions that were consistent with the existing codebase. That's the leap. It saved a massive amount of time and let me focus on what the app should *do* rather than the mechanics of how to build it.

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)

### Installation

```bash
git clone https://github.com/Mandy324/insightTube.git
cd insightTube
npm install
npm run tauri dev
```

### Configuration

1. Open the app and go to **Settings**
2. Add your **OpenAI API key** and/or **Google Gemini API key**
3. Select your preferred AI provider and model
4. Start pasting YouTube URLs and learning!
