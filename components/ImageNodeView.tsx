import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';

export const ImageNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes } = props;
  const [showAltEditor, setShowAltEditor] = useState(false);
  const [altText, setAltText] = useState(node.attrs.alt || '');

  const saveAltText = () => {
    updateAttributes({ alt: altText });
    setShowAltEditor(false);
  };

  return (
    <NodeViewWrapper className="image-wrapper">
      <div className="image-container">
        <img 
          src={node.attrs.src} 
          alt={node.attrs.alt || ''} 
          className="image-content"
          onClick={() => setShowAltEditor(true)}
        />
        {node.attrs.alt && (
          <div className="alt-text-indicator">
            Alt: {node.attrs.alt}
          </div>
        )}
      </div>

      {showAltEditor && (
        <div className="alt-text-editor">
          <input
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Enter alt text for this image"
          />
          <button onClick={saveAltText}>Save</button>
          <button onClick={() => setShowAltEditor(false)}>Cancel</button>
        </div>
      )}

      <style jsx>{`
        .image-wrapper {
          position: relative;
          margin: 1em 0;
        }
        .image-container {
          position: relative;
          display: inline-block;
        }
        .image-content {
          max-width: 100%;
        }
        .alt-text-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          background: rgba(0,0,0,0.5);
          color: white;
          padding: 2px 6px;
          font-size: 12px;
        }
        .alt-text-editor {
          margin-top: 8px;
          display: flex;
          gap: 8px;
        }
        .alt-text-editor input {
          flex-grow: 1;
          padding: 4px 8px;
        }
        .alt-text-editor button {
          padding: 4px 8px;
          background: #f1f1f1;
          border: 1px solid #ddd;
          cursor: pointer;
        }
      `}</style>
    </NodeViewWrapper>
  );
};