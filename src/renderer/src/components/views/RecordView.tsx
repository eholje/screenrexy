import { useEffect, useCallback } from 'react'
import { useCaptureStore } from '../../stores/captureStore'
import { useRecording, formatDuration } from '../../hooks/useRecording'
import type { RecordingOptions } from '../../../../shared/types/capture.types'

export function RecordView(): JSX.Element {
  const {
    sources,
    selectedSource,
    isLoadingSources,
    settings,
    loadSources,
    setSelectedSource,
    updateSettings
  } = useCaptureStore()

  const {
    state: recordingState,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording
  } = useRecording({
    onRecordingComplete: async (blob) => {
      // Save the recording
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recording-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: (error) => {
      console.error('Recording error:', error)
      alert('Recording failed: ' + error.message)
    }
  })

  useEffect(() => {
    loadSources()
  }, [loadSources])

  const handleStartRecording = useCallback(async () => {
    if (!selectedSource) return

    const options: RecordingOptions = {
      sourceId: selectedSource.id,
      sourceType: selectedSource.id.startsWith('screen') ? 'screen' : 'window',
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
  }, [selectedSource, settings, startRecording])

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Screen Recording</h1>
        <button
          onClick={loadSources}
          disabled={isLoadingSources || recordingState !== 'idle'}
          className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          {isLoadingSources ? 'Loading...' : 'Refresh Sources'}
        </button>
      </div>

      {/* Source selection */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Select Source</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => setSelectedSource(source)}
              disabled={recordingState !== 'idle'}
              className={`
                relative flex flex-col rounded-lg border-2 overflow-hidden transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
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
                className="w-full h-24 object-cover bg-muted"
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

          {sources.length === 0 && !isLoadingSources && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No capture sources found. Click "Refresh Sources" to scan again.
            </div>
          )}
        </div>
      </div>

      {/* Recording options */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Options</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={settings.includeMicrophone}
              onChange={(e) => updateSettings({ includeMicrophone: e.target.checked })}
              disabled={recordingState !== 'idle'}
              className="rounded border-border"
            />
            Include microphone
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={settings.includeAudio}
              onChange={(e) => updateSettings({ includeAudio: e.target.checked })}
              disabled={recordingState !== 'idle'}
              className="rounded border-border"
            />
            Include system audio
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showCursor}
              onChange={(e) => updateSettings({ showCursor: e.target.checked })}
              disabled={recordingState !== 'idle'}
              className="rounded border-border"
            />
            Show cursor
          </label>
        </div>
      </div>

      {/* Recording controls */}
      <div className="flex items-center gap-4 pt-4">
        {recordingState === 'idle' ? (
          <button
            onClick={handleStartRecording}
            disabled={!selectedSource}
            className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8" />
            </svg>
            Start Recording
          </button>
        ) : recordingState === 'processing' ? (
          <div className="flex items-center gap-2 text-foreground">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Processing...</span>
          </div>
        ) : (
          <>
            <button
              onClick={handleStopRecording}
              className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg font-semibold hover:bg-destructive/90 transition-colors flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              Stop
            </button>
            <button
              onClick={handlePauseResume}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors flex items-center gap-2"
            >
              {recordingState === 'paused' ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Resume
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Pause
                </>
              )}
            </button>
          </>
        )}

        {recordingState !== 'idle' && recordingState !== 'processing' && (
          <div className="flex items-center gap-2 text-foreground">
            <span
              className={`w-3 h-3 rounded-full ${
                recordingState === 'paused' ? 'bg-yellow-500' : 'bg-destructive animate-pulse'
              }`}
            />
            <span className="font-mono text-lg">{formatDuration(duration)}</span>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="text-sm text-muted-foreground mt-4">
        <p>Tips:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Use <kbd className="px-1 py-0.5 bg-secondary rounded text-xs">Ctrl+Shift+R</kbd> to start/stop recording</li>
          <li>System audio capture may require additional permissions on some systems</li>
          <li>Recordings are saved as WebM files</li>
        </ul>
      </div>
    </div>
  )
}
