import { useState } from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  url: string | null;
  onClose: () => void;
}

export function ImageModal({ url, onClose }: ImageModalProps) {
  if (!url) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="image-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
        <img src={url} alt="" className="modal-image" />
      </div>
    </div>
  );
}

export default ImageModal;
