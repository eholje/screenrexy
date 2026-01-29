import { useEffect, useCallback, useState } from 'react'
import { useCaptureStore } from '../../stores/captureStore'
import { useRecording, formatDuration } from '../../hooks/useRecording'
import type { RecordingOptions, CaptureSource } from '../../../../shared/types/capture.types'

interface RecordViewProps {
  onNavigate?: (view: 'annotate', screenshot?: string) => void
}

export function RecordView({ onNavigate }: RecordViewProps): JSX.Element {
  const { sources, settings, updateSettings, loadSources: loadAllSources } = useCaptureStore()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [detectedWindow, setDetectedWindow] = useState<CaptureSource | null>(null)
  const [selectedSource, setSelectedSource] = useState<CaptureSource | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [isLoadingSources, setIsLoadingSources] = useState(false)

  const {
    state: recordingState,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording
  } = useRecording({
    onRecordingComplete: async (blob) => {
      // Save with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const buffer = await blob.arrayBuffer()

      try {
        const filePath = await window.api.file.saveAuto({
          buffer,
          filename: `recording-${timestamp}.webm`,
          subfolder: 'Recordings'
        })
        console.log('Recording saved to:', filePath)
      } catch (error) {
        console.error('Failed to save recording:', error)
        // Fallback to browser download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `recording-${timestamp}.webm`
        a.click()
        URL.revokeObjectURL(url)
      }
    },
    onError: (error) => {
      console.error('Recording error:', error)
      alert('Recording failed: ' + error.message)
    }
  })

  // Auto-detect focused window on mount
  useEffect(() => {
    detectActiveWindow()
  }, [])

  const detectActiveWindow = async () => {
    setIsDetecting(true)
    try {
      // Try to get focused window first
      const focusedWindow = await window.api.capture.getFocusedWindow()
      if (focusedWindow) {
        setDetectedWindow(focusedWindow)
        setSelectedSource(focusedWindow)
      } else {
        // Fallback to primary screen
        const primaryScreen = await window.api.capture.getPrimaryScreen()
        setDetectedWindow(primaryScreen)
        setSelectedSource(primaryScreen)
      }
    } catch (error) {
      console.error('Failed to detect window:', error)
      // Final fallback: get any source
      try {
        const sources = await window.api.capture.getSources()
        if (sources.length > 0) {
          setDetectedWindow(sources[0])
          setSelectedSource(sources[0])
        }
      } catch (e) {
        console.error('Failed to get any sources:', e)
      }
    } finally {
      setIsDetecting(false)
    }
  }

  const loadSourceGrid = async () => {
    setIsLoadingSources(true)
    try {
      await loadAllSources()
    } finally {
      setIsLoadingSources(false)
    }
  }

  const handleStartRecording = useCallback(async () => {
    const source = selectedSource || detectedWindow
    if (!source) {
      alert('No window detected. Please try refreshing.')
      return
    }

    const options: RecordingOptions = {
      sourceId: source.id,
      sourceType: source.id.startsWith('screen') ? 'screen' : 'window',
      includeAudio: settings.includeAudio,
      includeMicrophone: settings.includeMicrophone,
      quality: settings.quality,
      fps: settings.fps
    }

    try {
      await startRecording(options)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Failed to start recording. Make sure you have granted screen capture permissions.')
    }
  }, [detectedWindow, selectedSource, settings, startRecording])

  const handleTakeScreenshot = useCallback(async () => {
    const source = selectedSource || detectedWindow
    if (!source) {
      alert('No window detected. Please try refreshing.')
      return
    }

    try {
      // Capture screenshot using getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id
          }
        } as MediaTrackConstraints
      })

      // Create video element to capture frame
      const video = document.createElement('video')
      video.srcObject = stream
      video.autoplay = true

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play()
          resolve(null)
        }
      })

      // Capture frame to canvas
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)

      // Stop stream
      stream.getTracks().forEach(track => track.stop())

      // Get data URL
      const dataUrl = canvas.toDataURL('image/png')

      // Navigate to annotation view with screenshot
      if (onNavigate) {
        onNavigate('annotate', dataUrl)
      }
    } catch (error) {
      console.error('Failed to take screenshot:', error)
      alert('Failed to take screenshot. Make sure you have granted screen capture permissions.')
    }
  }, [detectedWindow, selectedSource, onNavigate])

  const handleStopRecording = useCallback(async () => {
    await stopRecording()
  }, [stopRecording])

  const handlePauseResume = useCallback(() => {
    if (recordingState === 'paused') {
      resumeRecording()
    } else {
      pauseRecording()
    }
  }, [recordingState, pauseRecording, resumeRecording])

  const handleToggleAdvanced = async () => {
    const newState = !showAdvanced
    setShowAdvanced(newState)
    if (newState && sources.length === 0) {
      await loadSourceGrid()
    }
  }

  const handleSourceSelect = (source: CaptureSource) => {
    setSelectedSource(source)
    setDetectedWindow(source)
  }

  // Idle state - big button UI
  if (recordingState === 'idle') {
    const currentSource = selectedSource || detectedWindow

    return (
      <div className="flex flex-col items-center justify-center h-full px-8 py-6">
        <div className="max-w-4xl w-full space-y-8">
          {/* What will be recorded */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">Ready to Capture</h1>
            {isDetecting ? (
              <p className="text-muted-foreground">Detecting active window...</p>
            ) : currentSource ? (
              <div className="space-y-3">
                <p className="text-lg text-muted-foreground">
                  {currentSource.id.startsWith('screen') ? 'Screen' : 'Window'}:
                </p>
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-lg">
                  {currentSource.thumbnail && (
                    <img
                      src={currentSource.thumbnail}
                      alt={currentSource.name}
                      className="w-16 h-10 object-cover rounded border border-border"
                    />
                  )}
                  <span className="font-semibold text-foreground">{currentSource.name}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-destructive">No window detected</p>
                <button
                  onClick={detectActiveWindow}
                  className="text-sm text-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* Advanced source selection */}
          {showAdvanced && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Select Source</h2>
                <button
                  onClick={loadSourceGrid}
                  disabled={isLoadingSources}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {isLoadingSources ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-2">
                {sources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => handleSourceSelect(source)}
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
                      className="w-full h-20 object-cover bg-muted"
                    />
                    <div className="p-2 bg-card">
                      <p className="text-xs font-medium text-foreground truncate">{source.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {source.id.startsWith('screen') ? 'Display' : 'Window'}
                      </p>
                    </div>
                    {selectedSource?.id === source.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-primary-foreground">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main action buttons */}
          <div className="flex flex-col items-center gap-8">
            {/* Primary actions - Video and Screenshot */}
            <div className="flex items-center gap-8">
              {/* Record Video Button */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleStartRecording}
                  disabled={!currentSource || isDetecting}
                  className="group relative w-40 h-40 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-2xl hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-2xl"
                >
                  <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col items-center justify-center h-full">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="white" className="mb-2">
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                    <span className="text-white font-bold text-lg">Video</span>
                  </div>
                </button>
                <span className="text-xs text-muted-foreground">Record video</span>
              </div>

              {/* Screenshot Button */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleTakeScreenshot}
                  disabled={!currentSource || isDetecting}
                  className="group relative w-40 h-40 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-2xl hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-2xl"
                >
                  <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col items-center justify-center h-full">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="mb-2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="text-white font-bold text-lg">Screenshot</span>
                  </div>
                </button>
                <span className="text-xs text-muted-foreground">Capture & annotate</span>
              </div>
            </div>

            {/* Quick settings */}
            <div className="flex items-center gap-6 text-sm">
              <label className="flex items-center gap-2 text-foreground cursor-pointer hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={settings.includeMicrophone}
                  onChange={(e) => updateSettings({ includeMicrophone: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                Microphone
              </label>
              <label className="flex items-center gap-2 text-foreground cursor-pointer hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={settings.includeAudio}
                  onChange={(e) => updateSettings({ includeAudio: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                System Audio
              </label>
            </div>

            {/* Advanced options toggle */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleToggleAdvanced}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
                {showAdvanced ? 'Hide' : 'Show'} source selection & advanced settings
              </button>

              {/* Advanced settings (quality, fps) - only show when advanced is expanded */}
              {showAdvanced && (
                <div className="w-full max-w-md space-y-4 p-6 bg-card border border-border rounded-lg">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Quality</label>
                    <select
                      value={settings.quality}
                      onChange={(e) => updateSettings({ quality: e.target.value as any })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    >
                      <option value="low">Low (720p)</option>
                      <option value="medium">Medium (1080p)</option>
                      <option value="high">High (1440p)</option>
                      <option value="ultra">Ultra (4K)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Frame Rate</label>
                    <select
                      value={settings.fps}
                      onChange={(e) => updateSettings({ fps: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                    >
                      <option value="24">24 fps</option>
                      <option value="30">30 fps</option>
                      <option value="60">60 fps</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showCursor}
                      onChange={(e) => updateSettings({ showCursor: e.target.checked })}
                      className="w-4 h-4 rounded border-border"
                    />
                    Show cursor in recording
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Tip */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Press <kbd className="px-2 py-1 bg-secondary rounded text-xs font-mono">Ctrl+Shift+R</kbd> for video or <kbd className="px-2 py-1 bg-secondary rounded text-xs font-mono">Ctrl+Shift+S</kbd> for screenshot</p>
          </div>
        </div>
      </div>
    )
  }

  // Recording/Paused/Processing states - floating controls
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="max-w-2xl w-full space-y-12">
        {/* Large timer display */}
        <div className="text-center space-y-6">
          {recordingState === 'processing' ? (
            <>
              <div className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <h2 className="text-2xl font-semibold text-foreground">Processing...</h2>
              </div>
              <p className="text-muted-foreground">Saving your recording</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-4">
                <div
                  className={`w-6 h-6 rounded-full ${
                    recordingState === 'paused' ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                  }`}
                />
                <h2 className="text-xl font-medium text-muted-foreground">
                  {recordingState === 'paused' ? 'Paused' : 'Recording'}
                </h2>
              </div>
              <div className="font-mono text-7xl font-bold text-foreground tracking-wider">
                {formatDuration(duration)}
              </div>
            </>
          )}
        </div>

        {/* Control buttons */}
        {recordingState !== 'processing' && (
          <div className="flex items-center justify-center gap-6">
            {/* Stop button - primary action */}
            <button
              onClick={handleStopRecording}
              className="group flex flex-col items-center gap-3"
            >
              <div className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center group-hover:scale-105">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </div>
              <span className="text-sm font-medium text-foreground">Stop</span>
            </button>

            {/* Pause/Resume button - secondary action */}
            <button
              onClick={handlePauseResume}
              className="group flex flex-col items-center gap-3"
            >
              <div className="w-20 h-20 rounded-full bg-secondary hover:bg-secondary/80 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center group-hover:scale-105">
                {recordingState === 'paused' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-secondary-foreground">
                    <polygon points="8,5 19,12 8,19" />
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-secondary-foreground">
                    <rect x="7" y="5" width="3" height="14" rx="1" />
                    <rect x="14" y="5" width="3" height="14" rx="1" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium text-foreground">
                {recordingState === 'paused' ? 'Resume' : 'Pause'}
              </span>
            </button>
          </div>
        )}

        {/* Recording info */}
        {recordingState === 'recording' && (selectedSource || detectedWindow) && (
          <div className="text-center text-sm text-muted-foreground">
            Recording: <span className="font-medium text-foreground">{(selectedSource || detectedWindow)?.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
