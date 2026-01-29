import { useAnnotationStore } from '../../stores/annotationStore'
import type { AnnotationTool } from '../../../../shared/types/annotation.types'
import { DEFAULT_COLORS } from '../../../../shared/types/annotation.types'

const tools: { id: AnnotationTool; label: string; icon: JSX.Element }[] = [
  {
    id: 'select',
    label: 'Select',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      </svg>
    )
  },
  {
    id: 'pen',
    label: 'Pen',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
      </svg>
    )
  },
  {
    id: 'highlighter',
    label: 'Highlighter',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l-6 6v3h3l6-6" />
        <path d="M22 12l-4.6 4.6a2 2 0 01-2.8 0l-5.2-5.2a2 2 0 010-2.8L14 4" />
      </svg>
    )
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    )
  },
  {
    id: 'circle',
    label: 'Circle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
      </svg>
    )
  },
  {
    id: 'arrow',
    label: 'Arrow',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    )
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    )
  },
  {
    id: 'eraser',
    label: 'Eraser',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 20H7L3 16c-1-1-1-2.5 0-3.5l9.5-9.5c1-1 2.5-1 3.5 0l5.5 5.5c1 1 1 2.5 0 3.5L16 18" />
        <path d="M6 11l5 5" />
      </svg>
    )
  }
]

const strokeWidths = [1, 2, 3, 5, 8, 12]

interface AnnotationToolbarProps {
  onClear?: () => void
}

export function AnnotationToolbar({ onClear }: AnnotationToolbarProps): JSX.Element {
  const {
    tool,
    color,
    strokeWidth,
    fontSize,
    setTool,
    setColor,
    setStrokeWidth,
    setFontSize,
    undo,
    redo,
    canUndo,
    canRedo
  } = useAnnotationStore()

  return (
    <div className="flex items-center gap-4 p-3 bg-card border border-border rounded-lg">
      {/* Tools */}
      <div className="flex items-center gap-1">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`
              p-2 rounded-lg transition-colors
              ${tool === t.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }
            `}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        {DEFAULT_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`
              w-6 h-6 rounded-full border-2 transition-transform
              ${color === c ? 'border-primary scale-110' : 'border-transparent hover:scale-105'}
            `}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Stroke width */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">Size:</span>
        {strokeWidths.map((w) => (
          <button
            key={w}
            onClick={() => setStrokeWidth(w)}
            className={`
              w-8 h-8 flex items-center justify-center rounded-lg transition-colors
              ${strokeWidth === w
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
              }
            `}
            title={`${w}px`}
          >
            <div
              className="rounded-full bg-current"
              style={{ width: Math.min(w * 2, 20), height: Math.min(w * 2, 20) }}
            />
          </button>
        ))}
      </div>

      {/* Font size (for text tool) */}
      {tool === 'text' && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Font:</span>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm"
            >
              {[12, 16, 20, 24, 32, 48, 64].map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
          </svg>
        </button>
      </div>

      {/* Clear */}
      {onClear && (
        <button
          onClick={onClear}
          className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
          title="Clear all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      )}
    </div>
  )
}
