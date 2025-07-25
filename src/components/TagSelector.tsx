import React from 'react';
import { Annotation, Tag } from '../App';

interface Props {
  tags: readonly string[];
  selectedAnnotation: Annotation | null;
  onTagChange: (tag: Tag) => void;
}

const TagSelector: React.FC<Props> = ({ tags, selectedAnnotation, onTagChange }) => {
  if (!selectedAnnotation) return null;

  const getTagIcon = (tag: string) => {
    switch (tag) {
      case 'Button': return '🔲';
      case 'Input': return '📝';
      case 'Radio': return '⚪';
      case 'Dropdown': return '📋';
      default: return '📱';
    }
  };

  const getSourceIcon = (source: string) => {
    return source === 'manual' ? '👆' : '🤖';
  };

  return (
    <div className="tag-selector">
      <h3 className="tag-selector-title">Selected Element</h3>
      
      {/* Enhanced Element Info Card */}
      <div style={{ 
        marginBottom: 'var(--space-6)',
        padding: 'var(--space-4)',
        background: 'linear-gradient(135deg, var(--gray-50) 0%, var(--primary-blue-light) 100%)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--gray-200)'
      }}>
        {/* Source Information */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
          fontSize: 'var(--font-size-sm)'
        }}>
          <span style={{ fontSize: 'var(--font-size-base)' }}>
            {getSourceIcon(selectedAnnotation.source)}
          </span>
          <span style={{ fontWeight: '600' }}>Source:</span>
          <span style={{ 
            color: selectedAnnotation.source === 'manual' ? 'var(--primary-blue)' : 'var(--accent-orange)',
            fontWeight: '600',
            textTransform: 'capitalize'
          }}>
            {selectedAnnotation.source === 'manual' ? 'Manual' : 'AI Generated'}
          </span>
        </div>

        {/* Current Tag */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
          fontSize: 'var(--font-size-sm)'
        }}>
          <span style={{ fontSize: 'var(--font-size-base)' }}>
            {getTagIcon(selectedAnnotation.tag)}
          </span>
          <span style={{ fontWeight: '600' }}>Type:</span>
          <span style={{ 
            padding: 'var(--space-1) var(--space-2)',
            background: 'white',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: '600',
            color: 'var(--gray-700)',
            border: '1px solid var(--gray-300)'
          }}>
            {selectedAnnotation.tag}
          </span>
        </div>

        {/* Position and Size Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-3)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--gray-600)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--gray-700)' }}>📍 Position</span>
            <span>X: {Math.round(selectedAnnotation.x)}</span>
            <span>Y: {Math.round(selectedAnnotation.y)}</span>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--gray-700)' }}>📏 Size</span>
            <span>W: {Math.round(selectedAnnotation.width)}</span>
            <span>H: {Math.round(selectedAnnotation.height)}</span>
          </div>
        </div>
      </div>
      
      {/* Enhanced Tag Selection */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 'var(--font-size-sm)', 
          fontWeight: '600', 
          color: 'var(--gray-700)',
          marginBottom: 'var(--space-2)'
        }}>
          <span>🏷️</span>
          Change Element Type:
        </label>
        <div style={{ position: 'relative' }}>
          <select
            value={selectedAnnotation.tag}
            onChange={e => onTagChange(e.target.value as Tag)}
            className="tag-select"
            style={{
              paddingLeft: 'var(--space-10)' // Make room for icon
            }}
          >
            {tags.map(tag => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          {/* Icon overlay */}
          <div style={{
            position: 'absolute',
            left: 'var(--space-3)',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 'var(--font-size-base)',
            pointerEvents: 'none',
            zIndex: 1
          }}>
            {getTagIcon(selectedAnnotation.tag)}
          </div>
        </div>
      </div>
      
      {/* Enhanced Quick Actions */}
      <div style={{
        padding: 'var(--space-3)',
        background: 'linear-gradient(135deg, var(--accent-emerald-light) 0%, rgba(5, 150, 105, 0.1) 100%)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(5, 150, 105, 0.2)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--gray-600)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-2)',
          fontWeight: '600',
          color: 'var(--accent-emerald)'
        }}>
          <span>⚡</span>
          Quick Actions
        </div>
        <div style={{ lineHeight: '1.6' }}>
          <div>• <strong>Double-click</strong> annotation to delete</div>
          <div>• Press <strong>Delete</strong> key to remove</div>
          <div>• Press <strong>Escape</strong> key to deselect</div>
          <div>• <strong>Drag</strong> to reposition annotation</div>
        </div>
      </div>
    </div>
  );
};

export default TagSelector; 