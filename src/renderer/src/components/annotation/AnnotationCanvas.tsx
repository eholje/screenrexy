import { useRef, useState, useEffect, useCallback } from 'react'
import { Stage, Layer, Line, Rect, Circle, Arrow, Text, Transformer } from 'react-konva'
import type Konva from 'konva'
import { useAnnotationStore, generateAnnotationId } from '../../stores/annotationStore'
import type {
  Annotation,
  PenAnnotation,
  RectangleAnnotation,
  CircleAnnotation,
  ArrowAnnotation,
  TextAnnotation
} from '../../../../shared/types/annotation.types'

interface AnnotationCanvasProps {
  width: number
  height: number
  backgroundImage?: string
}

export function AnnotationCanvas({
  width,
  height,
  backgroundImage
}: AnnotationCanvasProps): JSX.Element {
  const stageRef = useRef<Konva.Stage>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<number[]>([])
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [editingText, setEditingText] = useState<string | null>(null)

  const {
    annotations,
    selectedId,
    tool,
    color,
    strokeWidth,
    fontSize,
    fontFamily,
    opacity,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectAnnotation
  } = useAnnotationStore()

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) return

    const selectedNode = selectedId
      ? layerRef.current.findOne(`#${selectedId}`)
      : null

    if (selectedNode && tool === 'select') {
      transformerRef.current.nodes([selectedNode])
      transformerRef.current.getLayer()?.batchDraw()
    } else {
      transformerRef.current.nodes([])
    }
  }, [selectedId, tool, annotations])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected annotation
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingText) {
        deleteAnnotation(selectedId)
      }
      // Escape to deselect
      if (e.key === 'Escape') {
        selectAnnotation(null)
        setEditingText(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, editingText, deleteAnnotation, selectAnnotation])

  const getPointerPosition = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    const pos = stage.getPointerPosition()
    return pos || { x: 0, y: 0 }
  }, [])

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // If clicking on empty area in select mode, deselect
      if (tool === 'select') {
        const clickedOnEmpty = e.target === e.target.getStage()
        if (clickedOnEmpty) {
          selectAnnotation(null)
        }
        return
      }

      // Eraser mode
      if (tool === 'eraser') {
        const clickedId = e.target.id()
        if (clickedId && clickedId.startsWith('annotation-')) {
          deleteAnnotation(clickedId)
        }
        return
      }

      // Text tool - create text on click
      if (tool === 'text') {
        const pos = getPointerPosition()
        const id = generateAnnotationId()

        const textAnnotation: TextAnnotation = {
          id,
          type: 'text',
          x: pos.x,
          y: pos.y,
          text: 'Text',
          color,
          strokeWidth,
          fontSize,
          fontFamily,
          opacity,
          createdAt: Date.now()
        }

        addAnnotation(textAnnotation)
        selectAnnotation(id)
        setEditingText(id)
        return
      }

      // Drawing tools
      const pos = getPointerPosition()
      setIsDrawing(true)
      setStartPos(pos)

      if (tool === 'pen' || tool === 'highlighter') {
        setCurrentPoints([pos.x, pos.y])
      }
    },
    [
      tool,
      color,
      strokeWidth,
      fontSize,
      fontFamily,
      opacity,
      selectAnnotation,
      deleteAnnotation,
      addAnnotation,
      getPointerPosition
    ]
  )

  const handleMouseMove = useCallback(() => {
    if (!isDrawing || !startPos) return

    const pos = getPointerPosition()

    if (tool === 'pen' || tool === 'highlighter') {
      setCurrentPoints((prev) => [...prev, pos.x, pos.y])
    }
  }, [isDrawing, startPos, tool, getPointerPosition])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !startPos) return

    const pos = getPointerPosition()
    const id = generateAnnotationId()

    if (tool === 'pen' || tool === 'highlighter') {
      if (currentPoints.length >= 4) {
        const annotation: PenAnnotation = {
          id,
          type: tool,
          points: currentPoints,
          color: tool === 'highlighter' ? color : color,
          strokeWidth: tool === 'highlighter' ? strokeWidth * 3 : strokeWidth,
          opacity: tool === 'highlighter' ? 0.4 : opacity,
          tension: 0.5,
          createdAt: Date.now()
        }
        addAnnotation(annotation)
      }
    } else if (tool === 'rectangle') {
      const width = pos.x - startPos.x
      const height = pos.y - startPos.y
      if (Math.abs(width) > 5 && Math.abs(height) > 5) {
        const annotation: RectangleAnnotation = {
          id,
          type: 'rectangle',
          x: width > 0 ? startPos.x : pos.x,
          y: height > 0 ? startPos.y : pos.y,
          width: Math.abs(width),
          height: Math.abs(height),
          color,
          strokeWidth,
          opacity,
          createdAt: Date.now()
        }
        addAnnotation(annotation)
      }
    } else if (tool === 'circle') {
      const radiusX = Math.abs(pos.x - startPos.x) / 2
      const radiusY = Math.abs(pos.y - startPos.y) / 2
      if (radiusX > 5 && radiusY > 5) {
        const annotation: CircleAnnotation = {
          id,
          type: 'circle',
          x: (startPos.x + pos.x) / 2,
          y: (startPos.y + pos.y) / 2,
          radiusX,
          radiusY,
          color,
          strokeWidth,
          opacity,
          createdAt: Date.now()
        }
        addAnnotation(annotation)
      }
    } else if (tool === 'arrow') {
      const dx = pos.x - startPos.x
      const dy = pos.y - startPos.y
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        const annotation: ArrowAnnotation = {
          id,
          type: 'arrow',
          points: [startPos.x, startPos.y, pos.x, pos.y],
          color,
          strokeWidth,
          opacity,
          pointerLength: strokeWidth * 4,
          pointerWidth: strokeWidth * 3,
          createdAt: Date.now()
        }
        addAnnotation(annotation)
      }
    }

    setIsDrawing(false)
    setCurrentPoints([])
    setStartPos(null)
  }, [
    isDrawing,
    startPos,
    tool,
    currentPoints,
    color,
    strokeWidth,
    opacity,
    addAnnotation,
    getPointerPosition
  ])

  const handleTextDblClick = useCallback(
    (annotation: TextAnnotation) => {
      setEditingText(annotation.id)

      // Create textarea for editing
      const stage = stageRef.current
      if (!stage) return

      const stageBox = stage.container().getBoundingClientRect()
      const textNode = stage.findOne(`#${annotation.id}`)
      if (!textNode) return

      const textPosition = textNode.getClientRect()

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)

      textarea.value = annotation.text
      textarea.style.position = 'absolute'
      textarea.style.top = `${stageBox.top + textPosition.y}px`
      textarea.style.left = `${stageBox.left + textPosition.x}px`
      textarea.style.width = `${Math.max(textPosition.width, 100)}px`
      textarea.style.height = `${Math.max(textPosition.height, 30)}px`
      textarea.style.fontSize = `${annotation.fontSize}px`
      textarea.style.fontFamily = annotation.fontFamily
      textarea.style.color = annotation.color
      textarea.style.border = 'none'
      textarea.style.padding = '0px'
      textarea.style.margin = '0px'
      textarea.style.overflow = 'hidden'
      textarea.style.background = 'transparent'
      textarea.style.outline = '2px solid #3b82f6'
      textarea.style.resize = 'none'
      textarea.style.lineHeight = '1'
      textarea.style.zIndex = '1000'

      textarea.focus()
      textarea.select()

      const handleBlur = () => {
        updateAnnotation(annotation.id, { text: textarea.value })
        setEditingText(null)
        document.body.removeChild(textarea)
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          textarea.blur()
        }
        if (e.key === 'Escape') {
          setEditingText(null)
          document.body.removeChild(textarea)
        }
      }

      textarea.addEventListener('blur', handleBlur)
      textarea.addEventListener('keydown', handleKeyDown)
    },
    [updateAnnotation]
  )

  const renderAnnotation = (annotation: Annotation) => {
    const isSelected = selectedId === annotation.id

    switch (annotation.type) {
      case 'pen':
      case 'highlighter':
        return (
          <Line
            key={annotation.id}
            id={annotation.id}
            points={annotation.points}
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth}
            opacity={annotation.opacity}
            tension={annotation.tension}
            lineCap="round"
            lineJoin="round"
            globalCompositeOperation={
              annotation.type === 'highlighter' ? 'multiply' : 'source-over'
            }
            onClick={() => tool === 'select' && selectAnnotation(annotation.id)}
          />
        )

      case 'rectangle':
        return (
          <Rect
            key={annotation.id}
            id={annotation.id}
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth}
            opacity={annotation.opacity}
            fill={annotation.fill}
            draggable={tool === 'select'}
            onClick={() => tool === 'select' && selectAnnotation(annotation.id)}
            onDragEnd={(e) => {
              updateAnnotation(annotation.id, {
                x: e.target.x(),
                y: e.target.y()
              })
            }}
            onTransformEnd={(e) => {
              const node = e.target
              const scaleX = node.scaleX()
              const scaleY = node.scaleY()
              node.scaleX(1)
              node.scaleY(1)
              updateAnnotation(annotation.id, {
                x: node.x(),
                y: node.y(),
                width: Math.max(5, node.width() * scaleX),
                height: Math.max(5, node.height() * scaleY)
              })
            }}
          />
        )

      case 'circle':
        return (
          <Circle
            key={annotation.id}
            id={annotation.id}
            x={annotation.x}
            y={annotation.y}
            radiusX={annotation.radiusX}
            radiusY={annotation.radiusY}
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth}
            opacity={annotation.opacity}
            fill={annotation.fill}
            draggable={tool === 'select'}
            onClick={() => tool === 'select' && selectAnnotation(annotation.id)}
            onDragEnd={(e) => {
              updateAnnotation(annotation.id, {
                x: e.target.x(),
                y: e.target.y()
              })
            }}
          />
        )

      case 'arrow':
        return (
          <Arrow
            key={annotation.id}
            id={annotation.id}
            points={annotation.points}
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth}
            opacity={annotation.opacity}
            pointerLength={annotation.pointerLength}
            pointerWidth={annotation.pointerWidth}
            fill={annotation.color}
            draggable={tool === 'select'}
            onClick={() => tool === 'select' && selectAnnotation(annotation.id)}
            onDragEnd={(e) => {
              const dx = e.target.x()
              const dy = e.target.y()
              e.target.x(0)
              e.target.y(0)
              updateAnnotation(annotation.id, {
                points: annotation.points.map((p, i) =>
                  i % 2 === 0 ? p + dx : p + dy
                ) as [number, number, number, number]
              })
            }}
          />
        )

      case 'text':
        return (
          <Text
            key={annotation.id}
            id={annotation.id}
            x={annotation.x}
            y={annotation.y}
            text={annotation.text}
            fontSize={annotation.fontSize}
            fontFamily={annotation.fontFamily}
            fill={annotation.color}
            opacity={annotation.opacity}
            draggable={tool === 'select'}
            visible={editingText !== annotation.id}
            onClick={() => tool === 'select' && selectAnnotation(annotation.id)}
            onDblClick={() => handleTextDblClick(annotation)}
            onDragEnd={(e) => {
              updateAnnotation(annotation.id, {
                x: e.target.x(),
                y: e.target.y()
              })
            }}
          />
        )

      default:
        return null
    }
  }

  // Render preview while drawing
  const renderDrawingPreview = () => {
    if (!isDrawing || !startPos) return null

    const pos = getPointerPosition()

    if (tool === 'pen' || tool === 'highlighter') {
      return (
        <Line
          points={currentPoints}
          stroke={color}
          strokeWidth={tool === 'highlighter' ? strokeWidth * 3 : strokeWidth}
          opacity={tool === 'highlighter' ? 0.4 : opacity}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation={
            tool === 'highlighter' ? 'multiply' : 'source-over'
          }
        />
      )
    }

    if (tool === 'rectangle') {
      const width = pos.x - startPos.x
      const height = pos.y - startPos.y
      return (
        <Rect
          x={width > 0 ? startPos.x : pos.x}
          y={height > 0 ? startPos.y : pos.y}
          width={Math.abs(width)}
          height={Math.abs(height)}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          dash={[5, 5]}
        />
      )
    }

    if (tool === 'circle') {
      const radiusX = Math.abs(pos.x - startPos.x) / 2
      const radiusY = Math.abs(pos.y - startPos.y) / 2
      return (
        <Circle
          x={(startPos.x + pos.x) / 2}
          y={(startPos.y + pos.y) / 2}
          radiusX={radiusX}
          radiusY={radiusY}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          dash={[5, 5]}
        />
      )
    }

    if (tool === 'arrow') {
      return (
        <Arrow
          points={[startPos.x, startPos.y, pos.x, pos.y]}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          pointerLength={strokeWidth * 4}
          pointerWidth={strokeWidth * 3}
          fill={color}
          dash={[5, 5]}
        />
      )
    }

    return null
  }

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        cursor:
          tool === 'select'
            ? 'default'
            : tool === 'eraser'
            ? 'crosshair'
            : 'crosshair',
        backgroundColor: '#1a1a1a'
      }}
    >
      <Layer ref={layerRef}>
        {annotations.map(renderAnnotation)}
        {renderDrawingPreview()}
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit minimum size
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox
            }
            return newBox
          }}
        />
      </Layer>
    </Stage>
  )
}
