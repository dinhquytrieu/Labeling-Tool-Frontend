import React, { useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage } from 'react-konva';
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

const MAX_WIDTH = 900; // px, adjust as needed
const MAX_HEIGHT = 700; // px, adjust as needed

const getScaledDimensions = (img: HTMLImageElement | undefined) => {
  if (!img) return { width: MAX_WIDTH, height: MAX_HEIGHT };
  const ratio = Math.min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height, 1);
  return {
    width: Math.round(img.width * ratio),
    height: Math.round(img.height * ratio),
    scale: ratio,
  };
};

const AnnotationCanvas: React.FC<Props> = ({ image, annotations, setAnnotations, selectedId, setSelectedId, tags }) => {
  const [img] = useImage(image);
  const [drawing, setDrawing] = useState(false);
  const [newRect, setNewRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const stageRef = useRef<any>(null);

  const handleMouseDown = (e: any) => {
    if (drawing) return;
    
    // Allow drawing on stage or image, but not on annotation rectangles
    const clickedOnAnnotation = e.target.className === 'Rect';
    
    if (!clickedOnAnnotation) {
      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();
      const { x, y } = pointerPosition;
      setNewRect({ x, y, width: 0, height: 0 });
      setDrawing(true);
      setSelectedId(null);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!drawing || !newRect) return;
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const { x, y } = pointerPosition;
    setNewRect({
      ...newRect,
      width: x - newRect.x,
      height: y - newRect.y,
    });
  };

  const handleMouseUp = () => {
    if (drawing && newRect && Math.abs(newRect.width) > 10 && Math.abs(newRect.height) > 10) {
      const finalRect = {
        x: Math.min(newRect.x, newRect.x + newRect.width),
        y: Math.min(newRect.y, newRect.y + newRect.height),
        width: Math.abs(newRect.width),
        height: Math.abs(newRect.height),
      };
      
      // Ensure box stays within image bounds
      if (img) {
        finalRect.x = Math.max(0, Math.min(finalRect.x, img.width - finalRect.width));
        finalRect.y = Math.max(0, Math.min(finalRect.y, img.height - finalRect.height));
        finalRect.width = Math.min(finalRect.width, img.width - finalRect.x);
        finalRect.height = Math.min(finalRect.height, img.height - finalRect.y);
      }
      
      setAnnotations([
        ...annotations,
        {
          ...finalRect,
          tag: tags[0],
          id: 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2),
          source: 'manual',
        },
      ]);
    }
    setDrawing(false);
    setNewRect(null);
  };

  const handleRectClick = (id: string) => {
    setSelectedId(id);
  };

  const handleDelete = useCallback((id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id));
    setSelectedId(null);
  }, [annotations, setAnnotations, setSelectedId]);

  // Keyboard delete
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId) {
        handleDelete(selectedId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, annotations, handleDelete]);

  // Drag and resize handlers
  const handleDragMove = (id: string, e: any) => {
    setAnnotations(annotations.map(a => a.id === id ? { ...a, x: e.target.x(), y: e.target.y() } : a));
  };

  const handleTransform = (id: string, e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    setAnnotations(annotations.map(a =>
      a.id === id
        ? {
            ...a,
            x: node.x(),
            y: node.y(),
            width: Math.max(10, node.width() * scaleX),
            height: Math.max(10, node.height() * scaleY),
          }
        : a
    ));
    node.scaleX(1);
    node.scaleY(1);
  };

  const dims = getScaledDimensions(img);

  return (
    <div className="annotation-canvas-container" style={{ maxWidth: MAX_WIDTH, maxHeight: MAX_HEIGHT, overflow: 'auto', margin: '0 auto' }}>
      <Stage
        width={dims.width}
        height={dims.height}
        ref={stageRef}
        scaleX={dims.scale}
        scaleY={dims.scale}
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
          {annotations.map((a) => (
            <Rect
              key={a.id}
              x={a.x}
              y={a.y}
              width={a.width}
              height={a.height}
              stroke={a.source === 'llm' ? '#ea580c' : '#2563eb'}
              strokeWidth={selectedId === a.id ? 3 : 2}
              dash={a.source === 'llm' ? [8, 4] : undefined}
              draggable
              onClick={() => handleRectClick(a.id)}
              onTap={() => handleRectClick(a.id)}
              onDragMove={e => handleDragMove(a.id, e)}
              onTransformEnd={e => handleTransform(a.id, e)}
              onDblClick={() => handleDelete(a.id)}
              onDblTap={() => handleDelete(a.id)}
              listening={true}
            />
          ))}
          {drawing && newRect && (
            <Rect
              x={newRect.x}
              y={newRect.y}
              width={newRect.width}
              height={newRect.height}
              stroke="#059669"
              strokeWidth={2}
              dash={[4, 4]}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default AnnotationCanvas; 