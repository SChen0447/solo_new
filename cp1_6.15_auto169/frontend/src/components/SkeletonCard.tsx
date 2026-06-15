const SkeletonCard = () => {
  return (
    <div className="tool-card skeleton">
      <div className="skeleton-image"></div>
      <div className="skeleton-content">
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line skeleton-desc"></div>
        <div className="skeleton-line skeleton-desc short"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
