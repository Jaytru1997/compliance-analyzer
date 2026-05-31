# Setup & Run Instructions

This guide provides instructions for setting up the AI-Powered Compliance Document Analyzer locally.

## Prerequisites
- Node.js (v18 or higher recommended)
- pnpm or npm (This project uses npm workspaces/Turborepo)
- An active Anthropic API Key (`claude-3-5-sonnet-20241022` access required)

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd compliance-analyzer
   ```

2. **Install Dependencies:**
   From the root of the monorepo, run:
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Copy the example environment file and add your API key:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and replace `your_anthropic_api_key_here` with your actual Anthropic API Key.

## Running the Application

This repository uses Turborepo to run multiple apps concurrently.

1. **Start Development Servers:**
   From the root directory, run:
   ```bash
   npm run dev
   ```
   This will simultaneously start:
   - **Frontend:** Typically accessible at `http://localhost:5173`
   - **Backend API:** Typically accessible at `http://localhost:3001`

2. **Accessing the App:**
   Open your browser and navigate to `http://localhost:5173`.
   - **Mock Login Credentials:**
     - Username: `admin`
     - Password: `admin123`

## Building for Production

To build all applications for production, run:
```bash
npm run build
```
This generates optimized static files in `apps/frontend/dist` and compiled TypeScript in `apps/backend/dist`.
