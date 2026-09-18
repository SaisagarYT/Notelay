# Notelay Desktop Application

A modern, desktop-based frontend replicating the **Google Antigravity** interface, designed to the highest industry standards with a responsive layout, custom desktop window frame, and clean aesthetics.

---

## Features

- **Desktop Frameless Window & Custom Titlebar**:
  - Full native drag region (`-webkit-app-region: drag`).
  - Native menus: `Notelay`, `File`, `View`, `Window`.
  - Windows 11-style window controls: Minimize (`─`), Maximize / Restore (`▢`), and Close (`✕`).
- **Top Navigation Bar**:
  - Sidebar toggle (`Ctrl+B`).
  - Navigation history (Back `←` and Forward `→`).
  - Antigravity gradient logo with `"Install IDE"` companion button.
- **Projects & Conversations Sidebar**:
  - `+ New Conversation` prominent pill button.
  - Quick access to `Conversation History` and `Scheduled Tasks`.
  - Interactive project tree with expandable/collapsible folders (`aptitude-test`, `BLUESTOCK_IPO`, `Personal`, `Internship`, `Notelay`, etc.).
  - Real-time task spinners for active background jobs.
  - Search filter for conversations.
  - Pinned `⚙ Settings` at the bottom.
- **Hero Prompt Canvas**:
  - Workspace selector pill (`📁 Notelay ⌵`) to quickly switch project context.
  - Floating elevated prompt card with multiline input and auto-resizing.
  - Add context/attachments (`+`).
  - Model selection dropdown (`Gemini 3.8 Flash High`, `Gemini 3.8 Pro`, `Claude 3.7 Sonnet`, `GPT-4o`).
  - Voice dictate toggle (`Mic`).
  - Action button (`→`) to launch conversations.
  - Execution mode picker (`🖥 Local ⌵`, `☁ Cloud Sandbox`, `📦 Isolated Container`).
- **Interactive Conversation Feed**:
  - User and Notelay Agent chat stream.
  - Collapsible **"Thinking Process"** accordion.
  - Interactive **Tool Activity Cards** (running commands, grep search, workspace analysis).
  - Syntax-highlighted code blocks with **Copy** and **Diff** support.
  - Bottom pinned response bar.
- **Modals & Drawers**:
  - **Settings**: Appearance, default coding model, API keys, execution preferences.
  - **History Drawer**: Searchable full conversation archive.
  - **Scheduled Tasks**: Cron and recurring automation manager.
  - **New Project**: Quick workspace folder creation.

---

## Tech Stack

- **Desktop Shell**: Electron 34
- **Frontend**: React 18 + TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State**: Persistent local storage hooks

---

## Running Notelay

Navigate to the project folder:
```powershell
cd C:\Users\saisa\Documents\Work\Projects\Personal\Notelay
```

### 1. Launch Direct Desktop App (Recommended)
Double-click [`run-notelay.bat`](file:///C:/Users/saisa/Documents/Work/Projects/Personal/Notelay/run-notelay.bat) or run:
```powershell
npm start
```

### 2. Live Development Mode (Vite HMR + Electron)
Double-click [`run-notelay-dev.bat`](file:///C:/Users/saisa/Documents/Work/Projects/Personal/Notelay/run-notelay-dev.bat) or run:
```powershell
npm run electron:dev
```

### 3. Browser Development Server
```powershell
npm run dev
```
(Server will run on `http://localhost:5180`)
