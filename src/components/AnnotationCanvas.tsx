import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Transformer } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Vector2d } from 'konva/lib/types';
// @ts-ignore: use-image has no types
import useImage from 'use-image';
import { Annotation, Tag } from '../App';

interface Props {
  image: string;
  annotations: Annotation[];
  setAnnotations: (anns: Annotation[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  tags: readonly Tag[];
}

interface DrawingState {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  annotation: Annotation | null;
}

const MAX_WIDTH = 900; // px, adjust as needed
const MAX_HEIGHT = 700; // px, adjust as needed
const MIN_BOX_SIZE = 10; // minimum size for a valid bounding box

const getDimensions = (img: HTMLImageElement | undefined) => {
  if (!img) return { width: MAX_WIDTH, height: MAX_HEIGHT };
  return {
    width: img.width,
    height: img.height,
  };
};

const constrainToImageBounds = (
  rect: DrawingState,
  imageWidth: number,
  imageHeight: number
): DrawingState => {
  const x = Math.max(0, Math.min(rect.x, imageWidth - rect.width));
  const y = Math.max(0, Math.min(rect.y, imageHeight - rect.height));
  const width = Math.min(rect.width, imageWidth - x);
  const height = Math.min(rect.height, imageHeight - y);
  
  return { x, y, width, height };
};

const AnnotationCanvas: React.FC<Props> = ({ 
  image, 
  annotations, 
  setAnnotations, 
  selectedId, 
  setSelectedId, 
  tags 
}) => {
  const [img] = useImage(image);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newRect, setNewRect] = useState<DrawingState | null>(null);
  const [cursor, setCursor] = useState<string>('crosshair');
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, annotation: null });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize dimensions without scaling
  const dimensions = useMemo(() => getDimensions(img), [img]);

  // Enhanced tooltip functionality
  const showTooltip = useCallback((annotation: Annotation, e: KonvaEventObject<MouseEvent>) => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const stage = e.target.getStage();
    const pointerPos = stage?.getPointerPosition();
    
    if (pointerPos) {
      setTooltip({
        visible: true,
        x: pointerPos.x + containerRect.left + 10,
        y: pointerPos.y + containerRect.top - 10,
        annotation
      });
    }
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip({ visible: false, x: 0, y: 0, annotation: null });
  }, []);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && selectedId) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedId]);

  const getPointerPosition = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>): Vector2d => {
    const stage = e.target.getStage();
    return stage?.getPointerPosition() || { x: 0, y: 0 };
  }, []);

  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (isDrawing) return;
    
    // Allow drawing on stage or image, but not on annotation rectangles
    const clickedOnAnnotation = e.target.className === 'Rect' && e.target.id() !== 'background';
    
    if (!clickedOnAnnotation) {
      const { x, y } = getPointerPosition(e);
      setNewRect({ x, y, width: 0, height: 0 });
      setIsDrawing(true);
      setSelectedId(null);
      setCursor('crosshair');
      hideTooltip();
    }
  }, [isDrawing, getPointerPosition, setSelectedId, hideTooltip]);

  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !newRect) return;
    
    const { x, y } = getPointerPosition(e);
    setNewRect(prev => prev ? {
      ...prev,
      width: x - prev.x,
      height: y - prev.y,
    } : null);
  }, [isDrawing, newRect, getPointerPosition]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !newRect || !img) {
      setIsDrawing(false);
      setNewRect(null);
      return;
    }

    // Only create annotation if box is large enough
    if (Math.abs(newRect.width) > MIN_BOX_SIZE && Math.abs(newRect.height) > MIN_BOX_SIZE) {
      const normalizedRect = {
        x: Math.min(newRect.x, newRect.x + newRect.width),
        y: Math.min(newRect.y, newRect.y + newRect.height),
        width: Math.abs(newRect.width),
        height: Math.abs(newRect.height),
      };
      
      // Constrain to image bounds
      const constrainedRect = constrainToImageBounds(normalizedRect, img.width, img.height);
      
      const newAnnotation: Annotation = {
        ...constrainedRect,
        tag: tags[0],
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        source: 'manual',
      };
      
      setAnnotations([...annotations, newAnnotation]);
      setSelectedId(newAnnotation.id);
    }
    
    setIsDrawing(false);
    setNewRect(null);
    setCursor('crosshair');
  }, [isDrawing, newRect, img, annotations, setAnnotations, setSelectedId, tags]);

  const handleRectClick = useCallback((e: any, id: string) => {
    e.cancelBubble = true;
    setSelectedId(selectedId === id ? null : id);
    hideTooltip();
  }, [selectedId, setSelectedId, hideTooltip]);

  const handleRectHover = useCallback((e: any, annotation: Annotation) => {
    setCursor('pointer');
    setHoveredId(annotation.id);
    showTooltip(annotation, e);
  }, [showTooltip]);

  const handleRectLeave = useCallback(() => {
    setCursor('crosshair');
    setHoveredId(null);
    hideTooltip();
  }, [hideTooltip]);

  const handleDelete = useCallback((id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id));
    setSelectedId(null);
    hideTooltip();
  }, [annotations, setAnnotations, setSelectedId, hideTooltip]);

  const handleDragMove = useCallback((id: string, e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const newPos = { x: node.x(), y: node.y() };
    
    // Constrain position to image bounds
    if (img) {
      const annotation = annotations.find(a => a.id === id);
      if (annotation) {
        newPos.x = Math.max(0, Math.min(newPos.x, img.width - annotation.width));
        newPos.y = Math.max(0, Math.min(newPos.y, img.height - annotation.height));
        node.position(newPos);
      }
    }
    
    setAnnotations(annotations.map(a => 
      a.id === id ? { ...a, x: newPos.x, y: newPos.y } : a
    ));
    hideTooltip();
  }, [annotations, setAnnotations, img, hideTooltip]);

  const handleTransform = useCallback((id: string, e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    const newAttrs = {
      x: node.x(),
      y: node.y(),
      width: Math.max(MIN_BOX_SIZE, node.width() * scaleX),
      height: Math.max(MIN_BOX_SIZE, node.height() * scaleY),
    };
    
    // Constrain to image bounds
    if (img) {
      const constrained = constrainToImageBounds(newAttrs, img.width, img.height);
      node.position({ x: constrained.x, y: constrained.y });
      node.size({ width: constrained.width, height: constrained.height });
    }
    
    setAnnotations(annotations.map(a =>
      a.id === id ? { ...a, ...newAttrs } : a
    ));
    
    // Reset scale to 1 to avoid compound scaling
    node.scaleX(1);
    node.scaleY(1);
  }, [annotations, setAnnotations, img]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId) {
        e.preventDefault();
        handleDelete(selectedId);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedId(null);
        hideTooltip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, handleDelete, setSelectedId, hideTooltip]);

  // Mouse leave for cursor changes
  const handleMouseLeave = useCallback(() => {
    setCursor('default');
    hideTooltip();
    setHoveredId(null);
    if (isDrawing) {
      handleMouseUp();
    }
  }, [isDrawing, handleMouseUp, hideTooltip]);

  const getTagIcon = (tag: string) => {
    switch (tag) {
      case 'Button': return '🔲';
      case 'Input': return '📝';
      case 'Radio': return '⚪';
      case 'Dropdown': return '📋';
      default: return '📱';
    }
  };

  const renderAnnotations = useMemo(() => {
    return annotations.map((a) => (
      <Rect
        key={a.id}
        id={a.id}
        x={a.x}
        y={a.y}
        width={a.width}
        height={a.height}
        stroke={a.source === 'llm' ? '#ea580c' : '#2563eb'}
        strokeWidth={selectedId === a.id ? 3 : hoveredId === a.id ? 2.5 : 2}
        dash={a.source === 'llm' ? [8, 4] : undefined}
        draggable
        onClick={(e) => handleRectClick(e, a.id)}
        onTap={(e) => handleRectClick(e, a.id)}
        onMouseEnter={(e) => handleRectHover(e, a)}
        onMouseLeave={handleRectLeave}
        onDragMove={(e) => handleDragMove(a.id, e)}
        onTransformEnd={(e: any) => handleTransform(a.id, e)}
        onDblClick={() => handleDelete(a.id)}
        onDblTap={() => handleDelete(a.id)}
        listening={true}
        // Accessibility
        name="annotation"
        perfectDrawEnabled={false}
        // Enhanced visual effects
        opacity={selectedId === a.id ? 0.9 : hoveredId === a.id ? 0.8 : 0.7}
        shadowColor={selectedId === a.id ? (a.source === 'llm' ? '#ea580c' : '#2563eb') : 'transparent'}
        shadowBlur={selectedId === a.id ? 10 : 0}
        shadowOffset={{ x: 0, y: 0 }}
        shadowOpacity={0.5}
      />
    ));
  }, [annotations, selectedId, hoveredId, handleRectClick, handleRectHover, handleRectLeave, handleDragMove, handleTransform, handleDelete]);

  const renderDrawingRect = useMemo(() => {
    if (!isDrawing || !newRect) return null;
    
    return (
      <Rect
        x={newRect.x}
        y={newRect.y}
        width={newRect.width}
        height={newRect.height}
        stroke="#059669"
        strokeWidth={2}
        dash={[4, 4]}
        listening={false}
        name="drawing-rect"
        opacity={0.8}
      />
    );
  }, [isDrawing, newRect]);

  // Enhanced floating tooltip
  const renderTooltip = () => {
    if (!tooltip.visible || !tooltip.annotation) return null;

    return (
      <div
        style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: 'var(--shadow-lg)',
          transform: 'translateY(-100%)',
          pointerEvents: 'none',
          animation: 'fadeIn var(--duration-fast) var(--ease-out)',
          maxWidth: '200px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
          <span>{getTagIcon(tooltip.annotation.tag)}</span>
          <strong>{tooltip.annotation.tag}</strong>
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.8, lineHeight: 1.3 }}>
          {tooltip.annotation.source === 'manual' ? '👆 Manual' : '🤖 AI Generated'}<br/>
          {Math.round(tooltip.annotation.width)} × {Math.round(tooltip.annotation.height)} px
        </div>
      </div>
    );
  };

  return (
    <>
      <div 
        ref={containerRef}
        className="annotation-canvas-container" 
        style={{ 
          maxWidth: MAX_WIDTH, 
          maxHeight: MAX_HEIGHT, 
          overflow: 'auto', 
          margin: '0 auto',
          cursor,
          userSelect: 'none',
          position: 'relative'
        }}
        role="application"
        aria-label="Image annotation canvas"
        tabIndex={0}
        onMouseLeave={handleMouseLeave}
      >
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          ref={stageRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ 
            border: '1px solid var(--gray-200)', 
            background: '#fff', 
            display: 'block',
            borderRadius: 'var(--radius-xl)'
          }}
        >
          <Layer>
            {img && <KonvaImage image={img} />}
            {renderAnnotations}
            {renderDrawingRect}
            {selectedId && (
              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                borderStroke="#2563eb"
                borderStrokeWidth={2}
                anchorStroke="#2563eb"
                anchorFill="white"
                anchorSize={8}
                anchorCornerRadius={2}
              />
            )}
          </Layer>
        </Stage>
        
        {/* Screen reader instructions */}
        <div className="sr-only" aria-live="polite">
          {selectedId ? 
            `Annotation selected. Press Delete to remove, Escape to deselect.` : 
            'Click and drag to create new annotation. Click existing annotations to select them.'
          }
        </div>
      </div>
      
      {/* Enhanced floating tooltip */}
      {renderTooltip()}
    </>
  );
};

export default AnnotationCanvas; 