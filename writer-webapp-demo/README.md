# Writer's Studio — AI Writing Companion (Demo)

A static demo frontend for **Writer's Studio**, an AI-powered writing companion that lets authors ingest their manuscripts, journal entries, audio transcripts, and notes — then generate summaries, analysis, and new creative works from their corpus.

This is a **demo-only** UI with simulated responses. In a production version, responses would be powered by Azure OpenAI with RAG over indexed writings.

## Features

| View | Description |
|------|-------------|
| **Writing Assistant** | Chat interface with creative modes — Summarize, Analyze, Generate, and Open Chat. Includes corpus scope filters and year/genre selectors. |
| **Corpus Library** | File manager for manuscripts, notes, and audio files. Shows upload, indexing, and transcription status. Supports drag-and-drop upload (demo only). |
| **Corpus Insights** | Analytics dashboard with theme frequency, stylistic metrics, vocabulary trends, and recent activity. |

## Tech Stack

- **Next.js 15** (static export)
- **React 19**
- **TypeScript**
- **react-markdown** for rendering AI responses

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (for deployment only)

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

The app is configured for static export (`output: "export"` in `next.config.ts`). To build:

```bash
npm run build
```

Static files are output to the `out/` directory.

## Deploy to Azure Static Web Apps

A one-step deployment script is included:

```powershell
.\deploy-swa.ps1 -appName writer-studio-demo -resourceGroup rg-writer-studio-poc -location centralus
```

The script will:

1. Build the static site
2. Create the resource group (if needed)
3. Create an Azure Static Web App (Free tier)
4. Deploy the `out/` directory using the SWA CLI

## Project Structure

```
writer-webapp-demo/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout with metadata
│   └── page.tsx             # Main page — view router
├── components/
│   ├── analytics.tsx        # Corpus Insights dashboard
│   ├── chat.tsx             # Writing Assistant chat UI
│   ├── corpus-manager.tsx   # Corpus Library file manager
│   └── sidebar.tsx          # Navigation sidebar
├── deploy-swa.ps1           # Azure SWA deployment script
├── next.config.ts           # Next.js config (static export)
├── staticwebapp.config.json # SWA routing config
├── swa-cli.config.json      # SWA CLI config
├── package.json
└── tsconfig.json
```
