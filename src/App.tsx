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

  const handleDownloadGroundTruth = () => {
    const manualAnnotations = annotations.filter(a => a.source === 'manual');
    if (manualAnnotations.length === 0) {
      alert('No manual annotations to export as ground truth');
      return;
    }
    
    const exportData = {
      image_filename: imageFilename,
      annotations: manualAnnotations.map(({ x, y, width, height, tag }) => ({ x, y, width, height, tag })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ground-truth-jsons/' + imageFilename.replace(/\.[^.]+$/, '') + '-annotations.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPredicted = () => {
    const aiAnnotations = annotations.filter(a => a.source === 'llm');
    if (aiAnnotations.length === 0) {
      alert('No AI predictions to export');
      return;
    }
    
    const exportData = {
      image_filename: imageFilename,
      annotations: aiAnnotations.map(({ x, y, width, height, tag }) => ({ x, y, width, height, tag })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'predicted-jsons/' + imageFilename.replace(/\.[^.]+$/, '') + '-annotations.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    // Export both types if both exist
    const manualAnnotations = annotations.filter(a => a.source === 'manual');
    const aiAnnotations = annotations.filter(a => a.source === 'llm');
    
    if (manualAnnotations.length > 0) {
      handleDownloadGroundTruth();
    }
    
    if (aiAnnotations.length > 0) {
      // Small delay to prevent browser blocking multiple downloads
      setTimeout(() => {
        handleDownloadPredicted();
      }, 100);
    }
    
    if (manualAnnotations.length === 0 && aiAnnotations.length === 0) {
      alert('No annotations to export');
    }
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
          {/* Left Panel - Upload Section */}
          <div className="left-panel">
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
          </div>

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
              {/* Enhanced Annotation Stats */}
              <div className="annotation-stats">
                <div className="stat-item stat-manual">
                  <div className="stat-indicator"></div>
                  <span>Manual: {manualCount}</span>
                </div>
                <div className="stat-item stat-ai">
                  <div className="stat-indicator"></div>
                  <span>AI Generated: {aiCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="controls-panel">
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
              </div>
              
              <h4 style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--gray-700)' }}>
                Export Options
              </h4>
              <div className="action-buttons">
                <button 
                  onClick={handleDownloadGroundTruth} 
                  className="btn btn-success"
                  disabled={manualCount === 0}
                  title="Export manual annotations as ground truth"
                >
                  <span>📝</span>
                  Ground Truth ({manualCount})
                </button>
                <button 
                  onClick={handleDownloadPredicted} 
                  className="btn btn-success"
                  disabled={aiCount === 0}
                  title="Export AI predictions"
                >
                  <span>🤖</span>
                  Predictions ({aiCount})
                </button>
                <button 
                  onClick={handleDownload} 
                  className="btn btn-success"
                  disabled={annotations.length === 0}
                  title="Export both ground truth and predictions"
                >
                  <span>💾</span>
                  Export All
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
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
