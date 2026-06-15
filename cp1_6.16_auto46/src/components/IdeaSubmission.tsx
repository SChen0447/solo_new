import { useState } from 'react';

interface IdeaSubmissionProps {
  onSubmit: (title: string, description: string) => void;
}

export default function IdeaSubmission({ onSubmit }: IdeaSubmissionProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxDescriptionLength = 200;
  const remainingChars = maxDescriptionLength - description.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    setTimeout(() => {
      onSubmit(title.trim(), description.trim());
      setTitle('');
      setDescription('');
      setIsSubmitting(false);
    }, 150);
  };

  return (
    <div className="submission-panel">
      <h2 className="panel-title">提交点子</h2>
      <form onSubmit={handleSubmit} className="submission-form">
        <div className="form-group">
          <label htmlFor="title">点子标题</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入点子标题..."
            className="form-input"
            maxLength={50}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">
            点子描述
            <span className={`char-count ${remainingChars < 20 ? 'warning' : ''}`}>
              {remainingChars}/{maxDescriptionLength}
            </span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, maxDescriptionLength))}
            placeholder="详细描述你的点子（最多200字）..."
            className="form-textarea"
            rows={5}
          />
        </div>
        
        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="submit-button"
        >
          {isSubmitting ? '提交中...' : '提交点子'}
        </button>
      </form>
    </div>
  );
}
