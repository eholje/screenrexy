import { create } from 'zustand'
import type {
  Annotation,
  AnnotationTool,
  AnnotationToolSettings,
  DEFAULT_TOOL_SETTINGS
} from '../../../shared/types/annotation.types'

interface AnnotationState {
  // Annotations
  annotations: Annotation[]
  selectedId: string | null

  // Tool settings
  tool: AnnotationTool
  color: string
  strokeWidth: number
  fontSize: number
  fontFamily: string
  opacity: number

  // History for undo/redo
  history: Annotation[][]
  historyIndex: number

  // Actions
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  selectAnnotation: (id: string | null) => void
  clearAnnotations: () => void

  // Tool actions
  setTool: (tool: AnnotationTool) => void
  setColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void
  setOpacity: (opacity: number) => void

  // History actions
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  saveToHistory: () => void
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  // Initial state
  annotations: [],
  selectedId: null,
  tool: 'pen',
  color: '#ff0000',
  strokeWidth: 3,
  fontSize: 24,
  fontFamily: 'Arial',
  opacity: 1,
  history: [[]],
  historyIndex: 0,

  // Annotation actions
  addAnnotation: (annotation) => {
    set((state) => ({
      annotations: [...state.annotations, annotation]
    }))
    get().saveToHistory()
  },

  updateAnnotation: (id, updates) => {
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      )
    }))
    get().saveToHistory()
  },

  deleteAnnotation: (id) => {
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId
    }))
    get().saveToHistory()
  },

  selectAnnotation: (id) => {
    set({ selectedId: id })
  },

  clearAnnotations: () => {
    set({ annotations: [], selectedId: null })
    get().saveToHistory()
  },

  // Tool actions
  setTool: (tool) => set({ tool, selectedId: null }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setFontSize: (fontSize) => set({ fontSize }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setOpacity: (opacity) => set({ opacity }),

  // History actions
  saveToHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push([...state.annotations])
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1
      }
    })
  },

  undo: () => {
    const { historyIndex, history } = get()
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      set({
        annotations: [...history[newIndex]],
        historyIndex: newIndex,
        selectedId: null
      })
    }
  },

  redo: () => {
    const { historyIndex, history } = get()
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      set({
        annotations: [...history[newIndex]],
        historyIndex: newIndex,
        selectedId: null
      })
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1
}))

// Helper to generate unique IDs
export function generateAnnotationId(): string {
  return `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
