import { useState, useEffect, useCallback, useRef } from 'react'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { MainContent } from './components/MainContent'
import { useCaptureStore } from './stores/captureStore'
import { IPC_CHANNELS } from '../../shared/constants/channels'

export type AppView = 'record' | 'screenshot' | 'annotate' | 'gallery' | 'settings'

function App(): JSX.Element {
  const [currentView, setCurrentView] = useState<AppView>('record')
  const [isDarkMode] = useState(true)
  const [notification, setNotification] = useState<string | null>(null)
  const [screenshotData, setScreenshotData] = useState<string | undefined>(undefined)
  const notificationTimeoutRef = useRef<number | null>(null)

  const { recordingState } = useCaptureStore()

  // Show notification
  const showNotification = useCallback((message: string) => {
    setNotification(message)
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
    }
    notificationTimeoutRef.current = window.setTimeout(() => {
      setNotification(null)
    }, 3000)
  }, [])

  // Handle hotkey events from main process
  useEffect(() => {
    const handleHotkey = (action: string) => {
      console.log('Hotkey triggered:', action)

      switch (action) {
        case 'startStopRecording':
          // Navigate to record view and trigger recording
          setCurrentView('record')
          showNotification(
            recordingState === 'idle' ? 'Starting recording...' : 'Stopping recording...'
          )
          // The actual recording logic is handled in RecordView
          // We dispatch a custom event that RecordView listens to
          window.dispatchEvent(new CustomEvent('hotkey:startStopRecording'))
          break

        case 'pauseRecording':
          if (recordingState === 'recording' || recordingState === 'paused') {
            window.dispatchEvent(new CustomEvent('hotkey:pauseRecording'))
            showNotification(recordingState === 'paused' ? 'Resumed recording' : 'Paused recording')
          }
          break

        case 'screenshot':
          setCurrentView('screenshot')
          showNotification('Taking screenshot...')
          window.dispatchEvent(new CustomEvent('hotkey:screenshot'))
          break

        case 'regionScreenshot':
          setCurrentView('screenshot')
          showNotification('Select region for screenshot...')
          window.dispatchEvent(new CustomEvent('hotkey:regionScreenshot'))
          break
      }
    }

    window.api.on(IPC_CHANNELS.HOTKEY_TRIGGERED, handleHotkey)

    return () => {
      window.api.off(IPC_CHANNELS.HOTKEY_TRIGGERED, handleHotkey)
    }
  }, [recordingState, showNotification])

  // Apply dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Keyboard shortcuts within app
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z for undo (handled by annotation store)
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        window.dispatchEvent(new CustomEvent('app:undo'))
      }
      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        window.dispatchEvent(new CustomEvent('app:redo'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleViewChange = useCallback((view: AppView, screenshot?: string) => {
    if (view === 'annotate' && screenshot) {
      setScreenshotData(screenshot)
    }
    setCurrentView(view)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <MainContent
          currentView={currentView}
          onViewChange={handleViewChange}
          screenshotData={screenshotData}
        />
      </div>

      {/* Notification toast */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="px-4 py-3 bg-card border border-border rounded-lg shadow-lg">
            <p className="text-sm text-foreground">{notification}</p>
          </div>
        </div>
      )}

      {/* Recording indicator (always visible when recording) */}
      {(recordingState === 'recording' || recordingState === 'paused') && (
        <div className="fixed top-12 right-4 z-50">
          <div className="flex items-center gap-2 px-3 py-2 bg-destructive/90 text-white rounded-lg shadow-lg">
            <span
              className={`w-3 h-3 rounded-full ${
                recordingState === 'paused' ? 'bg-yellow-400' : 'bg-white animate-pulse'
              }`}
            />
            <span className="text-sm font-medium">
              {recordingState === 'paused' ? 'Paused' : 'Recording'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
