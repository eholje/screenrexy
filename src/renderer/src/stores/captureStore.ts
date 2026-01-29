import { create } from 'zustand'
import type {
  CaptureSource,
  RecordingState,
  VideoQuality,
  CaptureRegion
} from '../../../shared/types/capture.types'

export interface CaptureSettings {
  quality: VideoQuality
  fps: number
  includeAudio: boolean
  includeMicrophone: boolean
  showCursor: boolean
  outputFormat: 'mp4' | 'webm'
  outputPath: string
}

interface CaptureStore {
  // Sources
  sources: CaptureSource[]
  selectedSource: CaptureSource | null
  isLoadingSources: boolean

  // Recording state
  recordingState: RecordingState
  recordingDuration: number
  recordingRegion: CaptureRegion | null

  // Settings
  settings: CaptureSettings

  // Actions
  setSources: (sources: CaptureSource[]) => void
  setSelectedSource: (source: CaptureSource | null) => void
  setIsLoadingSources: (loading: boolean) => void
  setRecordingState: (state: RecordingState) => void
  setRecordingDuration: (duration: number) => void
  setRecordingRegion: (region: CaptureRegion | null) => void
  updateSettings: (settings: Partial<CaptureSettings>) => void
  loadSources: () => Promise<void>
}

const defaultSettings: CaptureSettings = {
  quality: 'high',
  fps: 30,
  includeAudio: true,
  includeMicrophone: true,
  showCursor: true,
  outputFormat: 'mp4',
  outputPath: ''
}

export const useCaptureStore = create<CaptureStore>((set, get) => ({
  // Initial state
  sources: [],
  selectedSource: null,
  isLoadingSources: false,
  recordingState: 'idle',
  recordingDuration: 0,
  recordingRegion: null,
  settings: defaultSettings,

  // Actions
  setSources: (sources) => set({ sources }),

  setSelectedSource: (source) => set({ selectedSource: source }),

  setIsLoadingSources: (loading) => set({ isLoadingSources: loading }),

  setRecordingState: (state) => set({ recordingState: state }),

  setRecordingDuration: (duration) => set({ recordingDuration: duration }),

  setRecordingRegion: (region) => set({ recordingRegion: region }),

  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    })),

  loadSources: async () => {
    const { setIsLoadingSources, setSources, setSelectedSource, selectedSource } = get()
    setIsLoadingSources(true)

    try {
      const sources = await window.api.capture.getSources()
      setSources(sources)

      // Auto-select first source if none selected
      if (!selectedSource && sources.length > 0) {
        setSelectedSource(sources[0])
      }
    } catch (error) {
      console.error('Failed to load capture sources:', error)
    } finally {
      setIsLoadingSources(false)
    }
  }
}))
