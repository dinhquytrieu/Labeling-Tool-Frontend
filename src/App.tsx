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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFilename(file.name);
    setImageUrl(null); // Clear previous URL
    setAnnotations([]); // Clear previous annotations
    setSelectedId(null); // Clear selection
    setIsUploading(true);
    
    try {
      // Create local preview
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to backend
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/annotate/upload`, {
        method: 'POST',
        body: formData,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        setImageUrl(uploadData.url);
        console.log('Image uploaded:', uploadData.url);
      } else {
        const error = await uploadRes.text();
        alert(`Upload failed: ${error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload error: ${error}`);
    } finally {
      setIsUploading(false);
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
    if (!imageUrl) {
      alert('Please wait for image upload to complete before predicting');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/annotate/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
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

  const getButtonText = () => {
    if (isLoading) return 'Analyzing with AI...';
    if (isUploading) return 'Upload in progress...';
    if (!imageUrl) return 'Upload image first';
    return 'Generate AI Annotations';
  };

  const selectedAnnotation = annotations.find(a => a.id === selectedId);
  const manualCount = annotations.filter(a => a.source === 'manual').length;
  const aiCount = annotations.filter(a => a.source === 'llm').length;

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">UI Annotation Tool</h1>
        <p className="app-subtitle">Intelligent annotation with AI-powered detection</p>
      </header>

      {/* Main Content */}
      {!image ? (
        <div className="upload-card">
          <div className="upload-section">
            <h2 className="upload-title">Upload an Image</h2>
            <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-6)' }}>
              Choose an image to start annotating UI elements
            </p>
            <div className="file-input-wrapper">
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleImageUpload}
                disabled={isUploading}
                className="file-input"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="file-input-button">
                <span>📁</span>
                {isUploading ? 'Uploading...' : 'Choose Image'}
              </label>
            </div>
            {isUploading && (
              <div className="status-indicator status-uploading">
                <span className="loading-dots">⏳</span>
                Uploading to cloud storage...
              </div>
            )}
            {imageUrl && (
              <div className="status-indicator status-success">
                <span>✓</span>
                Upload successful!
              </div>
            )}
            <div style={{ marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
              Supported formats: PNG, JPEG, WebP (max 10MB)
            </div>
          </div>
        </div>
      ) : (
        <div className="main-content">
          {/* Canvas Section */}
          <div className="canvas-section">
            <div className="canvas-container">
              <AnnotationCanvas
                image={image}
                annotations={annotations}
                setAnnotations={setAnnotations}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                tags={TAGS}
              />
              {/* Annotation Stats */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: 'var(--space-6)', 
                marginTop: 'var(--space-4)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--gray-600)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    border: '2px solid var(--primary-blue)', 
                    borderRadius: 'var(--radius-sm)' 
                  }}></div>
                  Manual: {manualCount}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    border: '2px dashed var(--accent-orange)', 
                    borderRadius: 'var(--radius-sm)' 
                  }}></div>
                  AI Generated: {aiCount}
                </div>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="controls-panel">
            {/* Upload New Image */}
            <div className="upload-card">
              <div className="upload-section">
                <h3 className="upload-title">Change Image</h3>
                <div className="file-input-wrapper">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="file-input"
                    id="image-upload-new"
                  />
                  <label htmlFor="image-upload-new" className="file-input-button">
                    <span>📁</span>
                    {isUploading ? 'Uploading...' : 'Upload New'}
                  </label>
                </div>
                {isUploading && (
                  <div className="status-indicator status-uploading">
                    <span className="loading-dots">⏳</span>
                    Uploading...
                  </div>
                )}
                {imageUrl && (
                  <div className="status-indicator status-success">
                    <span>✓</span>
                    Ready for AI analysis
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="actions-card">
              <h3 className="actions-title">Actions</h3>
              <div className="action-buttons">
                <button 
                  onClick={handlePredict} 
                  disabled={isLoading || isUploading || !imageUrl}
                  className="btn btn-primary"
                >
                  {isLoading && <span className="loading-dots">🤖</span>}
                  {!isLoading && <span>🤖</span>}
                  {getButtonText()}
                </button>
                <button 
                  onClick={handleDownload} 
                  className="btn btn-success"
                  disabled={annotations.length === 0}
                >
                  <span>💾</span>
                  Export Annotations
                </button>
              </div>
            </div>

            {/* Tag Selector */}
            {selectedAnnotation && (
              <TagSelector
                tags={TAGS}
                selectedAnnotation={selectedAnnotation}
                onTagChange={(tag: Tag) => {
                  setAnnotations(anns => anns.map(a => a.id === selectedId ? { ...a, tag } : a));
                }}
              />
            )}

            {/* Instructions */}
            <div className="instructions-card">
              <h3 className="instructions-title">How to Use</h3>
              <ul className="instructions-list">
                <li>Click and drag to draw bounding boxes</li>
                <li>Click boxes to select and change tags</li>
                <li>Double-click boxes to delete them</li>
                <li>Press Delete key to remove selected box</li>
                <li>Use "Generate AI Annotations" for automatic detection</li>
                <li>Manual annotations (blue solid) and AI annotations (orange dashed)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
