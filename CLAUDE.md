# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start with hot reload (main + renderer)
npm run build           # Build all processes (main + preload + renderer)
npm run build:win       # Build and package Windows installer (.exe)
npm run build:unpack    # Build without creating installer (for testing)

# Type checking
npm run typecheck       # Check all TypeScript
npm run typecheck:node  # Check main/preload only
npm run typecheck:web   # Check renderer only

# Code quality
npm run lint            # Lint and fix all files
```

## Architecture Overview

ScreenRexy is an Electron app for screen recording, screenshots, and annotations. It follows the standard Electron multi-process architecture with strict IPC communication.

### Three-Process Model

```
┌──────────────────────┐
│   MAIN PROCESS       │  Node.js environment
│   src/main/          │  - Window management, tray
│                      │  - Global hotkeys (HotkeyService)
│                      │  - File I/O, desktopCapturer
└──────────────────────┘
          ↕ IPC (typed channels)
┌──────────────────────┐
│   PRELOAD            │  Context bridge
│   src/preload/       │  - Exposes safe APIs via window.api
│                      │  - All IPC goes through here
└──────────────────────┘
          ↕ window.api
┌──────────────────────┐
│   RENDERER           │  Browser environment
│   src/renderer/      │  - React 18 + TypeScript
│                      │  - Zustand stores (captureStore, annotationStore)
│                      │  - RecordingService (MediaRecorder wrapper)
│                      │  - Konva.js for annotations
└──────────────────────┘
```

### IPC Communication Pattern

**Critical**: All main ↔ renderer communication goes through:
1. **Channel definitions**: `src/shared/constants/channels.ts` (single source of truth)
2. **Preload exposure**: `src/preload/index.ts` exposes `window.api.*` methods
3. **Main handlers**: `src/main/handlers/*.handler.ts` registers `ipcMain.handle()`
4. **Renderer usage**: Components call `window.api.capture.getSources()`, etc.

**Adding new IPC**:
1. Add channel to `IPC_CHANNELS` in `channels.ts`
2. Create handler in `src/main/handlers/` and register in `main/index.ts`
3. Add method to preload `api` object
4. Call from renderer via `window.api.*`

### State Management

**Zustand stores** (not React Context):
- `captureStore.ts`: Recording state, sources, duration, settings
- `annotationStore.ts`: Canvas state, tool selection, undo/redo history

**Why Zustand**: Simpler than Redux, no Provider boilerplate, hooks-based.

### Recording Architecture

1. **Source selection**: `desktopCapturer.getSources()` in main process → sent to renderer
2. **Stream acquisition**: `getUserMedia()` with `chromeMediaSourceId` (Electron-specific)
3. **Audio mixing**:
   - System audio: `getDisplayMedia({ audio: true })`
   - Microphone: separate `getUserMedia({ audio: true })`
   - Combined via `MediaStream` with multiple tracks
4. **Recording**: `MediaRecorder` (WebM/VP9) in `RecordingService.ts`
5. **File save**: Blob → ArrayBuffer → IPC → main process writes file

### Key Services

**RecordingService** (`src/renderer/src/services/RecordingService.ts`):
- Singleton wrapping `MediaRecorder`
- Handles pause/resume, duration tracking
- Event-based callbacks (`onStateChange`, `onDurationUpdate`)
- Auto-selects best supported codec (VP9 > VP8)

**HotkeyService** (`src/main/services/HotkeyService.ts`):
- Uses Electron's `globalShortcut` API
- Sends events to renderer via `HOTKEY_TRIGGERED` channel
- Configurable accelerators stored in service state

### View Routing

**Simple string-based routing** in `App.tsx` (no React Router):
```typescript
type AppView = 'record' | 'screenshot' | 'annotate' | 'gallery' | 'settings'
```
- Sidebar sets `currentView` state
- `MainContent` component renders corresponding view
- Hotkeys can change views (e.g., screenshot hotkey → switches to `screenshot` view)

### Hotkey Event Flow

1. User presses global hotkey (e.g., Ctrl+Shift+R)
2. Main process `HotkeyService` catches it
3. Sends `HOTKEY_TRIGGERED` IPC event with action name
4. `App.tsx` receives event, switches view, dispatches custom DOM event
5. View component listens to custom event and performs action

**Custom events used**: `hotkey:startStopRecording`, `hotkey:screenshot`, etc.

### Annotation System

Built with **Konva.js** (via react-konva):
- `AnnotationCanvas.tsx`: Konva Stage/Layer rendering
- `annotationStore.ts`: Tool state, shapes array, undo/redo stack
- Tools: Select, Pen, Highlighter, Rectangle, Circle, Arrow, Text, Eraser
- History: State snapshots pushed on each shape completion
- Export: Canvas → dataURL → PNG file

## Build Configuration

**electron-vite** config (`electron.vite.config.ts`):
- Three separate builds: main, preload, renderer
- Renderer uses Vite dev server with HMR in development
- Tailwind CSS processed via PostCSS plugin in renderer build

**Output**:
- Development: `process.env.ELECTRON_RENDERER_URL` (Vite server)
- Production: `out/main/index.js`, `out/preload/index.js`, `out/renderer/index.html`

## Important Patterns

### Don't Break IPC Type Safety
❌ **Never** call `ipcRenderer` directly from renderer code
✅ **Always** use `window.api.*` methods (defined in preload)

### Recording State Machine
States: `idle` → `recording` → `paused` → `recording` → `processing` → `idle`
- `processing` = MediaRecorder stopped, combining chunks
- Always check current state before transitions

### File Paths
- Recordings saved to: `app.getPath('videos')/ScreenTool/`
- Use `file:save-auto` for automatic naming with timestamps
- Use `file:save` for user-selected paths (shows dialog)

### Custom Titlebar
- `frame: false` in BrowserWindow config
- Custom `TitleBar.tsx` component handles window controls
- IPC handlers for minimize/maximize/close in `main/index.ts`

## Common Gotchas

1. **System audio on Windows**: Requires "Stereo Mix" enabled or virtual audio device
2. **desktopCapturer**: Only works in main process, sources sent to renderer via IPC
3. **MediaRecorder codec**: Check `isTypeSupported()` before setting mimeType
4. **Tray icon**: Uses `nativeImage.createEmpty()` placeholder (replace with actual icon)
5. **Hot reload**: Main process changes require full restart, renderer has HMR
