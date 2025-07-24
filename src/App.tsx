import React, { useState } from 'react';
import './App.css';
import AnnotationCanvas from './components/AnnotationCanvas';
import TagSelector from './components/TagSelector';

const TAGS = ['Button', 'Input', 'Radio', 'Dropdown'] as const;

export type Tag = typeof TAGS[number];

export interface Annotation {
  x: number;
  y: number;
  width: number;
  height: number;
  tag: Tag;
  id: string;
  source: 'manual' | 'llm';
}

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFilename(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    const exportData = {
      image_filename: imageFilename,
      annotations: annotations.map(({ x, y, width, height, tag }) => ({ x, y, width, height, tag })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = imageFilename.replace(/\.[^.]+$/, '') + '-annotations.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePredict = async () => {
    if (!image) return;
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/annotate/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      if (res.ok) {
        const data = await res.json();
        const llmAnnotations = (data.annotations || []).map((a: any, idx: number) => ({
          ...a,
          id: 'llm-' + idx + '-' + Math.random().toString(36).slice(2),
          source: 'llm',
        }));
        setAnnotations(prev => [
          ...prev.filter(a => a.source !== 'llm'),
          ...llmAnnotations,
        ]);
      } else {
        const error = await res.text();
        alert(`Prediction failed: ${error}`);
      }
    } catch (error) {
      alert(`Network error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>UI Annotation Tool</h1>
      <input type="file" accept="image/png, image/jpeg" onChange={handleImageUpload} />
      {image && (
        <>
          <AnnotationCanvas
            image={image}
            annotations={annotations}
            setAnnotations={setAnnotations}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            tags={TAGS}
          />
          <TagSelector
            tags={TAGS}
            selectedAnnotation={annotations.find(a => a.id === selectedId) || null}
            onTagChange={(tag: Tag) => {
              setAnnotations(anns => anns.map(a => a.id === selectedId ? { ...a, tag } : a));
            }}
          />
          <div style={{ margin: '16px' }}>
            <button onClick={handlePredict} disabled={isLoading}>
              {isLoading ? 'Predicting...' : 'Predict (LLM Auto-Tag)'}
            </button>
            <button onClick={handleDownload} style={{ marginLeft: 8 }}>Download JSON</button>
          </div>
          <div style={{ margin: '16px', fontSize: '14px', color: '#666' }}>
            <p><strong>Instructions:</strong></p>
            <p>• Upload an image to start annotating</p>
            <p>• Click and drag to draw bounding boxes</p>
            <p>• Click boxes to select and change tags</p>
            <p>• Double-click boxes to delete them</p>
            <p>• Use "Predict" for AI-assisted annotation (orange dashed boxes)</p>
            <p>• Press Delete key to remove selected box</p>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
