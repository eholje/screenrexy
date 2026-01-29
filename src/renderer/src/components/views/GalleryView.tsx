import { useState, useEffect } from 'react'

interface CaptureFile {
  path: string
  name: string
  type: 'video' | 'image'
  size: number
  created: number
}

export function GalleryView(): JSX.Element {
  const [captures, setCaptures] = useState<CaptureFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCapture, setSelectedCapture] = useState<CaptureFile | null>(null)

  const loadCaptures = async () => {
    setIsLoading(true)
    try {
      const files = await window.api.file.getRecent(50)
      setCaptures(files)
    } catch (error) {
      console.error('Failed to load captures:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCaptures()
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // Today
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Yesterday
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.getDate() === yesterday.getDate()) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // This week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' }) + ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Older
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const handleOpenFolder = async () => {
    await window.api.file.openFolder()
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Recordings</h1>
        <div className="flex gap-2">
          <button
            onClick={loadCaptures}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={handleOpenFolder}
            className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Open Folder
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : captures.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground/50 mb-4"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <h2 className="text-lg font-semibold text-muted-foreground">No captures yet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your recordings and screenshots will appear here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {captures.map((capture) => (
              <div
                key={capture.path}
                className="group relative rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedCapture(capture)}
              >
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {capture.type === 'video' ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/50">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/50">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  )}
                </div>
                <div className="p-2 bg-card">
                  <p className="text-xs font-medium text-foreground truncate" title={capture.name}>
                    {capture.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(capture.created)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatFileSize(capture.size)}
                    </p>
                  </div>
                </div>

                {/* Type badge */}
                <div className={`
                  absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium
                  ${capture.type === 'video' ? 'bg-destructive/80 text-white' : 'bg-primary/80 text-white'}
                `}>
                  {capture.type === 'video' ? 'VIDEO' : 'IMAGE'}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    className="p-2 bg-primary rounded-lg text-primary-foreground hover:bg-primary/90"
                    title="Open"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Open file with default app
                      window.api.file.openFolder(capture.path)
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15,3 21,3 21,9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview modal */}
      {selectedCapture && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedCapture(null)}
        >
          <div className="max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-card rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedCapture.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedCapture.created)} - {formatFileSize(selectedCapture.size)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCapture(null)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 bg-black flex items-center justify-center">
                {selectedCapture.type === 'video' ? (
                  <video
                    src={`file://${selectedCapture.path}`}
                    controls
                    className="max-w-full max-h-[60vh]"
                  />
                ) : (
                  <img
                    src={`file://${selectedCapture.path}`}
                    alt={selectedCapture.name}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                )}
              </div>
              <div className="p-4 border-t border-border flex gap-2">
                <button
                  onClick={() => window.api.file.openFolder(selectedCapture.path)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Open in Explorer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
