/**
 * IPC Channel names for main <-> renderer communication
 */
export const IPC_CHANNELS = {
  // Window management
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',

  // Capture operations
  CAPTURE_GET_SOURCES: 'capture:get-sources',
  CAPTURE_START_RECORDING: 'capture:start-recording',
  CAPTURE_STOP_RECORDING: 'capture:stop-recording',
  CAPTURE_PAUSE_RECORDING: 'capture:pause-recording',
  CAPTURE_SCREENSHOT: 'capture:screenshot',

  // File operations
  FILE_SAVE: 'file:save',
  FILE_OPEN_FOLDER: 'file:open-folder',
  FILE_GET_RECENT: 'file:get-recent',

  // Hotkeys
  HOTKEY_TRIGGERED: 'hotkey:triggered',
  HOTKEY_REGISTER: 'hotkey:register',
  HOTKEY_UNREGISTER: 'hotkey:unregister',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Export
  EXPORT_START: 'export:start',
  EXPORT_PROGRESS: 'export:progress',
  EXPORT_COMPLETE: 'export:complete',
  EXPORT_ERROR: 'export:error',

  // App state
  APP_GET_PATH: 'app:get-path',
  APP_VERSION: 'app:version'
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]
