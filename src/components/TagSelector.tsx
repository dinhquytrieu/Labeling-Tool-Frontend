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
    <div className="controls">
      <label>
        Tag:
        <select
          value={selectedAnnotation.tag}
          onChange={e => onTagChange(e.target.value as Tag)}
        >
          {tags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default TagSelector; 