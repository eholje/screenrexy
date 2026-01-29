import { useState, useEffect } from 'react'

export function TitleBar(): JSX.Element {
  const [appVersion, setAppVersion] = useState<string>('')

  useEffect(() => {
    window.api.app.getVersion().then(setAppVersion)
  }, [])

  const handleMinimize = () => window.api.window.minimize()
  const handleMaximize = () => window.api.window.maximize()
  const handleClose = () => window.api.window.close()

  return (
    <div className="titlebar-drag flex items-center justify-between h-10 bg-card border-b border-border px-4">
      {/* App title */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-foreground">ScreenTool</span>
        {appVersion && (
          <span className="text-xs text-muted-foreground">v{appVersion}</span>
        )}
      </div>

      {/* Window controls */}
      <div className="titlebar-no-drag flex items-center gap-1">
        <button
          onClick={handleMinimize}
          className="w-10 h-8 flex items-center justify-center hover:bg-accent rounded transition-colors"
          aria-label="Minimize"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-foreground"
          >
            <rect y="5" width="12" height="2" fill="currentColor" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-8 flex items-center justify-center hover:bg-accent rounded transition-colors"
          aria-label="Maximize"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-foreground"
          >
            <rect
              x="1"
              y="1"
              width="10"
              height="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-8 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
          aria-label="Close"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-foreground"
          >
            <path
              d="M1 1L11 11M1 11L11 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
