import { useNavigate } from 'react-router-dom';
import ProgressRing from './ProgressRing';
import type { ClassData } from '../stores/classStore';

interface ClassCardProps {
  cls: ClassData;
  index: number;
}

function ClassCard({ cls, index }: ClassCardProps) {
  const navigate = useNavigate();
  const homeworkCount = cls.homeworkIds?.length || 0;
  const completionRate = Math.min(
    Math.round((homeworkCount / (homeworkCount + 1)) * 65 + 20),
    100
  );

  const handleClick = () => {
    navigate(`/class/${cls.id}/homework/hw-preview?classId=${cls.id}`);
  };

  const style = {
    animationDelay: `${index * 0.1}s`
  };

  return (
    <div
      className="class-card"
      onClick={handleClick}
      style={style}
    >
      <div className="card-header">
        <div>
          <h3 className="class-name">{cls.name}</h3>
          <div className="class-meta">
            <span className="badge badge-primary">{cls.grade}</span>
            <span className="badge">{cls.subject}</span>
          </div>
        </div>
      </div>

      <div className="card-stats">
        <div className="stat-item">
          <span className="stat-value">{cls.studentCount}</span>
          <span className="stat-label">学生人数</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{homeworkCount}</span>
          <span className="stat-label">作业数量</span>
        </div>
      </div>

      <ProgressRing percentage={completionRate} />
    </div>
  );
}

export default ClassCard;
