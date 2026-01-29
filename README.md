# ScreenTool

A Windows-focused Electron application for screen recording, screenshots, and annotations.

## Features

- **Screen Recording** - Record full screen or specific windows with audio capture
- **Screenshots** - Capture full screen, windows, or custom regions
- **Annotations** - Draw on screen with pen, shapes, arrows, and text
- **Voice Notes** - Record voice annotations with waveform visualization
- **Global Hotkeys** - System-wide shortcuts for quick capture
- **Gallery** - Browse and manage recent captures

## Architecture

### Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Electron 31 |
| Build Tool | electron-vite |
| UI Framework | React 18 + TypeScript |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Canvas/Annotations | Konva.js (react-konva) |
| Packaging | electron-builder |

### Project Structure

```
screentool/
├── electron.vite.config.ts    # Build configuration
├── electron-builder.yml       # Packaging configuration
├── package.json
├── tailwind.config.js
├── tsconfig.json
│
├── src/
│   ├── main/                  # Electron Main Process
│   │   ├── index.ts           # App entry, window management, tray
│   │   ├── handlers/
│   │   │   ├── capture.handler.ts   # desktopCapturer IPC
│   │   │   ├── file.handler.ts      # File save/load operations
│   │   │   └── hotkey.handler.ts    # Global shortcut IPC
│   │   └── services/
│   │       └── HotkeyService.ts     # Global shortcut management
│   │
│   ├── preload/               # Context Bridge
│   │   └── index.ts           # Exposes safe APIs to renderer
│   │
│   ├── renderer/              # React Application
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx       # React entry point
│   │       ├── App.tsx        # Root component with routing
│   │       ├── components/
│   │       │   ├── TitleBar.tsx
│   │       │   ├── Sidebar.tsx
│   │       │   ├── MainContent.tsx
│   │       │   ├── views/
│   │       │   │   ├── RecordView.tsx      # Recording UI
│   │       │   │   ├── ScreenshotView.tsx  # Screenshot UI
│   │       │   │   ├── AnnotateView.tsx    # Annotation canvas
│   │       │   │   ├── GalleryView.tsx     # File browser
│   │       │   │   └── SettingsView.tsx    # Configuration
│   │       │   ├── annotation/
│   │       │   │   ├── AnnotationCanvas.tsx
│   │       │   │   └── AnnotationToolbar.tsx
│   │       │   └── voice/
│   │       │       └── VoiceRecorder.tsx
│   │       ├── hooks/
│   │       │   └── useRecording.ts    # Recording state hook
│   │       ├── services/
│   │       │   └── RecordingService.ts # MediaRecorder wrapper
│   │       ├── stores/
│   │       │   ├── captureStore.ts    # Recording/capture state
│   │       │   └── annotationStore.ts # Annotation state + history
│   │       └── styles/
│   │           └── globals.css        # Tailwind + CSS variables
│   │
│   └── shared/                # Shared between processes
│       ├── types/
│       │   ├── capture.types.ts
│       │   └── annotation.types.ts
│       └── constants/
│           └── channels.ts    # IPC channel names
│
└── resources/                 # App icons and assets
```

### IPC Communication

All communication between main and renderer processes uses typed IPC channels:

```
┌─────────────────────────────────────────────────────────────────┐
│                        RENDERER PROCESS                          │
│  React UI + Zustand Stores + RecordingService                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    window.api (contextBridge)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        PRELOAD SCRIPT                            │
│  Exposes safe APIs: capture, file, hotkey, window               │
└─────────────────────────────────────────────────────────────────┘
                              │
                      ipcRenderer ←→ ipcMain
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         MAIN PROCESS                             │
│  BrowserWindow + Tray + Handlers + HotkeyService                │
└─────────────────────────────────────────────────────────────────┘
```

**Key IPC Channels:**
- `capture:get-sources` - Get available screens/windows
- `capture:save-screenshot` - Save screenshot to file/clipboard
- `file:save`, `file:get-recent` - File operations
- `hotkey:triggered` - Global shortcut events
- `window:minimize/maximize/close` - Window controls

### Recording Flow

```
1. User selects source via desktopCapturer.getSources()
2. getUserMedia() acquires video stream with chromeMediaSourceId
3. Optional: Add microphone audio track
4. MediaRecorder captures stream as WebM
5. ondataavailable collects Blob chunks
6. On stop: combine chunks, save file
```

### Annotation System

Built with Konva.js for high-performance canvas rendering:

- **Tools**: Select, Pen, Highlighter, Rectangle, Circle, Arrow, Text, Eraser
- **History**: Full undo/redo with state snapshots
- **Persistence**: Export canvas as PNG

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd screentool

# Install dependencies
npm install
```

### Development Mode

```bash
# Start with hot reload
npm run dev
```

This will:
1. Build main and preload scripts
2. Start Vite dev server for renderer
3. Launch Electron with hot reload

### Type Checking

```bash
# Check all TypeScript
npm run typecheck

# Check main/preload only
npm run typecheck:node

# Check renderer only
npm run typecheck:web
```

### Linting

```bash
npm run lint
```

## Building

### Production Build

```bash
# Build all (main + preload + renderer)
npm run build
```

Output is in `out/` directory.

### Windows Installer

```bash
# Build and package for Windows
npm run build:win
```

Creates `dist/ScreenTool-1.0.0-setup.exe` (NSIS installer).

### Unpacked Build (for testing)

```bash
# Build without creating installer
npm run build:unpack
```

## Configuration

### Video Quality Presets

Defined in `src/shared/types/capture.types.ts`:

| Preset | Resolution | Bitrate |
|--------|------------|---------|
| Low | 1280x720 | 2.5 Mbps |
| Medium | 1920x1080 | 5 Mbps |
| High | 2560x1440 | 10 Mbps |
| Ultra | 3840x2160 | 20 Mbps |

### Default Hotkeys

| Action | Shortcut |
|--------|----------|
| Start/Stop Recording | Ctrl+Shift+R |
| Pause Recording | Ctrl+Shift+P |
| Screenshot | Ctrl+Shift+S |
| Region Screenshot | Ctrl+Shift+A |

Hotkeys can be customized in Settings.

### Output Location

Recordings and screenshots are saved to:
- Windows: `%USERPROFILE%\Videos\ScreenTool\`
- Linux: `~/Videos/ScreenTool/`

## Testing

### Manual Testing Checklist

**Recording:**
- [ ] Source picker shows all screens/windows
- [ ] Recording starts and timer runs
- [ ] Pause/resume works
- [ ] Stop creates valid WebM file
- [ ] Microphone audio captured (if enabled)

**Screenshots:**
- [ ] Fullscreen capture works
- [ ] Window capture works
- [ ] Copies to clipboard
- [ ] Saves to file (PNG/JPG)

**Annotations:**
- [ ] Pen draws smooth lines
- [ ] Shapes render correctly
- [ ] Text can be added and edited
- [ ] Undo/redo works
- [ ] Export produces valid image

**Hotkeys:**
- [ ] Work when app is minimized
- [ ] Can be customized in settings
- [ ] Visual feedback on trigger

**Gallery:**
- [ ] Shows recent captures
- [ ] Preview works
- [ ] Can open in file explorer

## Troubleshooting

### Linux: Sandbox Error

If you see "SUID sandbox helper binary" error:

```bash
# Option 1: Disable sandbox (development only)
ELECTRON_DISABLE_SANDBOX=1 npm run dev

# Option 2: Fix sandbox permissions
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

### Linux: No Display

Electron requires a display server. On headless servers:

```bash
# Install Xvfb for virtual display
sudo apt install xvfb
xvfb-run npm run dev
```

### Windows: Recording Permission

If screen recording fails, ensure the app has screen recording permissions in Windows Settings > Privacy > Screen recording.

### Audio Capture Issues

System audio capture on Windows may require:
- Enabling "Stereo Mix" in sound settings
- Or using a virtual audio device

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run typecheck`
5. Submit a pull request
