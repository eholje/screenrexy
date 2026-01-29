import { useState, useCallback, useEffect } from 'react'
import { useCaptureStore } from '../../stores/captureStore'

type CaptureMode = 'fullscreen' | 'window' | 'region'

export function ScreenshotView(): JSX.Element {
  const [captureMode, setCaptureMode] = useState<CaptureMode>('fullscreen')
  const [copyToClipboard, setCopyToClipboard] = useState(true)
  const [saveToFile, setSaveToFile] = useState(true)
  const [format, setFormat] = useState<'png' | 'jpg'>('png')
  const [isCapturing, setIsCapturing] = useState(false)
  const [lastCapture, setLastCapture] = useState<string | null>(null)

  const { sources, selectedSource, loadSources, setSelectedSource } = useCaptureStore()

  useEffect(() => {
    loadSources()
  }, [loadSources])

  const captureScreen = useCallback(async (sourceId: string): Promise<string> => {
    // Get the stream from the source
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      } as MediaTrackConstraints
    })

    // Create video element to capture frame
    const video = document.createElement('video')
    video.srcObject = stream
    video.muted = true

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play()
        resolve()
      }
    })

    // Wait a frame for video to render
    await new Promise((resolve) => requestAnimationFrame(resolve))

    // Draw to canvas
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)

    // Stop the stream
    stream.getTracks().forEach((track) => track.stop())

    // Get data URL
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
    const quality = format === 'jpg' ? 0.92 : undefined
    return canvas.toDataURL(mimeType, quality)
  }, [format])

  const handleCapture = async () => {
    setIsCapturing(true)

    try {
      let sourceId: string

      if (captureMode === 'fullscreen') {
        // Get primary screen
        const primaryScreen = await window.api.capture.getPrimaryScreen()
        if (!primaryScreen) {
          throw new Error('No screen found')
        }
        sourceId = primaryScreen.id
      } else if (captureMode === 'window') {
        if (!selectedSource) {
          throw new Error('No window selected')
        }
        sourceId = selectedSource.id
      } else {
        // Region mode - for now, capture fullscreen and let user crop later
        const primaryScreen = await window.api.capture.getPrimaryScreen()
        if (!primaryScreen) {
          throw new Error('No screen found')
        }
        sourceId = primaryScreen.id
      }

      const dataUrl = await captureScreen(sourceId)
      setLastCapture(dataUrl)

      // Save the screenshot
      const result = await window.api.capture.saveScreenshot({
        dataUrl,
        copyToClipboard,
        saveToFile,
        filename: `screenshot-${Date.now()}.${format}`
      })

      // Show feedback
      if (result.clipboardSuccess && copyToClipboard) {
        console.log('Screenshot copied to clipboard')
      }
      if (result.filePath) {
        console.log('Screenshot saved to:', result.filePath)
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      alert('Failed to capture screenshot: ' + (error as Error).message)
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Screenshot</h1>

      {/* Capture mode selection */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Capture Mode</h2>
        <div className="flex gap-4">
          {(['fullscreen', 'window', 'region'] as CaptureMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setCaptureMode(mode)}
              disabled={isCapturing}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                disabled:opacity-50
                ${
                  captureMode === mode
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {mode === 'fullscreen' && (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="2" />
                </svg>
              )}
              {mode === 'window' && (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <circle cx="6" cy="6" r="1" fill="currentColor" />
                  <circle cx="9" cy="6" r="1" fill="currentColor" />
                </svg>
              )}
              {mode === 'region' && (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2v4M18 2v4M6 18v4M18 18v4M2 6h4M2 18h4M18 6h4M18 18h4" strokeDasharray="2 2" />
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
              )}
              <span className="text-sm font-medium capitalize">{mode}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Window selection (when window mode is selected) */}
      {captureMode === 'window' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Select Window</h2>
            <button
              onClick={loadSources}
              className="text-sm text-primary hover:underline"
            >
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-48 overflow-y-auto">
            {sources
              .filter((s) => !s.id.startsWith('screen'))
              .map((source) => (
                <button
                  key={source.id}
                  onClick={() => setSelectedSource(source)}
                  className={`
                    relative flex flex-col rounded-lg border-2 overflow-hidden transition-all
                    ${
                      selectedSource?.id === source.id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <img
                    src={source.thumbnail}
                    alt={source.name}
                    className="w-full h-16 object-cover bg-muted"
                  />
                  <div className="p-1 bg-card">
                    <p className="text-[10px] font-medium text-foreground truncate">{source.name}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Options</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={copyToClipboard}
              onChange={(e) => setCopyToClipboard(e.target.checked)}
              disabled={isCapturing}
              className="rounded border-border"
            />
            Copy to clipboard
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={saveToFile}
              onChange={(e) => setSaveToFile(e.target.checked)}
              disabled={isCapturing}
              className="rounded border-border"
            />
            Save to file
          </label>
        </div>
      </div>

      {/* Format selection */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Format</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFormat('png')}
            disabled={isCapturing}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              format === 'png'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            PNG
          </button>
          <button
            onClick={() => setFormat('jpg')}
            disabled={isCapturing}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              format === 'jpg'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            JPG
          </button>
        </div>
      </div>

      {/* Capture button */}
      <div className="pt-4">
        <button
          onClick={handleCapture}
          disabled={isCapturing || (captureMode === 'window' && !selectedSource)}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isCapturing ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Capturing...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="12" cy="13" r="4" />
                <line x1="12" y1="4" x2="12" y2="4" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Capture Screenshot
            </>
          )}
        </button>
        <p className="mt-2 text-sm text-muted-foreground">
          Tip: Use <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">Ctrl+Shift+S</kbd> for quick capture
        </p>
      </div>

      {/* Preview of last capture */}
      {lastCapture && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Last Capture</h2>
          <div className="relative inline-block">
            <img
              src={lastCapture}
              alt="Last screenshot"
              className="max-w-full max-h-64 rounded-lg border border-border"
            />
            <button
              onClick={() => window.api.file.copyToClipboard(lastCapture)}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
              title="Copy to clipboard"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
