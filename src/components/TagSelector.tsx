import React from 'react';
import { Annotation, Tag } from '../App';

interface Props {
  tags: readonly string[];
  selectedAnnotation: Annotation | null;
  onTagChange: (tag: Tag) => void;
}

const TagSelector: React.FC<Props> = ({ tags, selectedAnnotation, onTagChange }) => {
  if (!selectedAnnotation) return null;

  return (
    <div className="tag-selector">
      <h3 className="tag-selector-title">Selected Element</h3>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ 
          fontSize: 'var(--font-size-sm)', 
          color: 'var(--gray-600)', 
          marginBottom: 'var(--space-2)' 
        }}>
          Source: {selectedAnnotation.source === 'manual' ? (
            <span style={{ color: 'var(--primary-blue)', fontWeight: '600' }}>
              👆 Manual
            </span>
          ) : (
            <span style={{ color: 'var(--accent-orange)', fontWeight: '600' }}>
              🤖 AI Generated
            </span>
          )}
        </div>
        <div style={{ 
          fontSize: 'var(--font-size-sm)', 
          color: 'var(--gray-600)' 
        }}>
          Position: {Math.round(selectedAnnotation.x)}, {Math.round(selectedAnnotation.y)}
        </div>
        <div style={{ 
          fontSize: 'var(--font-size-sm)', 
          color: 'var(--gray-600)' 
        }}>
          Size: {Math.round(selectedAnnotation.width)} × {Math.round(selectedAnnotation.height)}
        </div>
      </div>
      
      <label style={{ 
        display: 'block', 
        fontSize: 'var(--font-size-sm)', 
        fontWeight: '600', 
        color: 'var(--gray-700)',
        marginBottom: 'var(--space-2)'
      }}>
        Element Type:
      </label>
      <select
        value={selectedAnnotation.tag}
        onChange={e => onTagChange(e.target.value as Tag)}
        className="tag-select"
      >
        {tags.map(tag => (
          <option key={tag} value={tag}>
            {tag === 'Button' && '🔲 '}
            {tag === 'Input' && '📝 '}
            {tag === 'Radio' && '⚪ '}
            {tag === 'Dropdown' && '📋 '}
            {tag}
          </option>
        ))}
      </select>
      
      <div style={{ 
        marginTop: 'var(--space-4)', 
        padding: 'var(--space-3)', 
        background: 'var(--gray-50)', 
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--gray-600)'
      }}>
        💡 Tip: Double-click the annotation to delete it, or press Delete key.
      </div>
    </div>
  );
};

export default TagSelector; 