# ScreenTool

Windows-focused Electron app for screen recording, screenshots, and annotations.

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Package for Windows
npm run build:win
```

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── index.ts    # App entry, window management
│   ├── handlers/   # IPC handlers
│   └── services/   # Main process services
├── preload/        # Context bridge (exposes API to renderer)
├── renderer/       # React UI
│   └── src/
│       ├── components/  # React components
│       ├── hooks/       # Custom React hooks
│       ├── services/    # Renderer services
│       └── stores/      # Zustand stores
└── shared/         # Shared types and constants
    ├── types/      # TypeScript interfaces
    └── constants/  # IPC channels, etc.
```

## IPC Communication

All communication between main and renderer uses typed IPC channels defined in `src/shared/constants/channels.ts`. The preload script (`src/preload/index.ts`) exposes a safe API via `window.api`.

## Key Technologies

- **Electron-vite**: Build tooling with hot reload
- **React 18**: UI framework
- **Tailwind CSS**: Styling
- **Zustand**: State management
- **Konva.js**: Canvas annotations (Phase 3)
- **MediaRecorder**: Screen recording
- **desktopCapturer**: Screen/window capture
