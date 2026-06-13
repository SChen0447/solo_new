import React, { useEffect, useState } from 'react';
import { X, Clock, ChefHat, ListOrdered } from 'lucide-react';
import { Recipe } from '../api/recipes';

interface RecipeModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
}

const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, isOpen, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        setAnimating(true);
      });
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setAnimating(false);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 300);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!recipe || !visible) return null;

  return (
    <div
      className={`modal-overlay ${animating ? 'open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={`modal-content ${animating ? 'open' : ''}`}>
        <button className="modal-close-btn" onClick={handleClose} aria-label="关闭">
          <X size={24} />
        </button>

        <div className="modal-image-wrapper">
          <img src={recipe.image} alt={recipe.name} />
          <div className="modal-image-overlay">
            <h2 className="modal-title">{recipe.name}</h2>
            <div className="modal-meta">
              <span className="meta-item">
                <Clock size={18} />
                {recipe.duration}分钟
              </span>
              <span className="meta-item">
                <ChefHat size={18} />
                {recipe.difficulty}
              </span>
            </div>
            <div className="modal-tags">
              {recipe.tags.map((tag) => (
                <span key={tag} className="modal-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-body">
          <div className="steps-section">
            <h3 className="section-heading">
              <ListOrdered size={20} />
              烹饪步骤
            </h3>
            <ol className="steps-list">
              {recipe.steps.map((step, index) => (
                <li key={index} className="step-item">
                  <span className="step-number">{index + 1}</span>
                  <span className="step-text">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeModal;
