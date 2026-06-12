import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { usePhotoStore } from '../data-layer/photoStore';
import PhotoCard from './PhotoCard';

const PhotoWall: React.FC = () => {
  const {
    photos,
    allPhotos,
    filterTag,
    loading,
    hasMore,
    loadMorePhotos,
    reorderPhotos,
    selectMode,
    selectedPhotoIds
  } = usePhotoStore();

  const observerRef = useRef<HTMLDivElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const [groups, setGroups] = useState<{ date: string; photos: typeof photos }[]>([]);

  const displayPhotos = useMemo(() => {
    if (filterTag) {
      return allPhotos.filter(p => p.tags.includes(filterTag));
    }
    return photos;
  }, [photos, allPhotos, filterTag]);

  useEffect(() => {
    const grouped: { [key: string]: typeof photos } = {};
    displayPhotos.forEach(photo => {
      const date = new Date(photo.date);
      const key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(photo);
    });

    const sortedGroups = Object.entries(grouped)
      .sort((a, b) => {
        const dateA = new Date(a[1][0].date);
        const dateB = new Date(b[1][0].date);
        return dateB.getTime() - dateA.getTime();
      })
      .map(([date, photos]) => ({ date, photos }));

    setGroups(sortedGroups);
  }, [displayPhotos]);

  useEffect(() => {
    if (filterTag) {
      return () => {};
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMorePhotos();
        }
      },
      { threshold: 0.1 }
    );

    intersectionObserverRef.current = observer;

    const targetEl = observerRef.current;
    if (targetEl) {
      observer.observe(targetEl);
    }

    return () => {
      if (targetEl) {
        observer.unobserve(targetEl);
      }
      observer.disconnect();
      if (intersectionObserverRef.current === observer) {
        intersectionObserverRef.current = null;
      }
    };
  }, [hasMore, loading, loadMorePhotos, filterTag]);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const allPhotosSorted = [...allPhotos].sort((a, b) => a.order - b.order);
      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      if (sourceIndex === destinationIndex) return;
      if (sourceIndex < 0 || sourceIndex >= allPhotosSorted.length) return;
      if (destinationIndex < 0 || destinationIndex >= allPhotosSorted.length) return;

      const [removed] = allPhotosSorted.splice(sourceIndex, 1);
      allPhotosSorted.splice(destinationIndex, 0, removed);

      const photoIds = allPhotosSorted.map(p => p.id);
      const orders = allPhotosSorted.map((_, index) => index);

      reorderPhotos(photoIds, orders);
    },
    [allPhotos, reorderPhotos]
  );

  const allFlatPhotos = useMemo(() => {
    return groups.flatMap(g => g.photos);
  }, [groups]);

  const getPhotoIndexInFlat = useCallback(
    (photoId: string): number => {
      return allFlatPhotos.findIndex(p => p.id === photoId);
    },
    [allFlatPhotos]
  );

  const SkeletonCard = () => (
    <div className="photo-card skeleton-card">
      <div className="skeleton skeleton-image" />
      <div className="photo-info">
        <div className="skeleton skeleton-text short" />
        <div className="skeleton skeleton-text long" />
      </div>
    </div>
  );

  return (
    <div className="photo-wall">
      {filterTag && (
        <div className="filter-notice">
          当前筛选：<span className="filter-tag-name">{filterTag}</span>
          <button
            className="clear-filter-btn"
            onClick={() => usePhotoStore.getState().setFilterTag(null)}
          >
            清除筛选
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="photos" direction="vertical">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="timeline-container"
            >
              {groups.map((group) => (
                <div key={group.date} className="timeline-group">
                  <div className="timeline-divider sticky">
                    <span className="timeline-date">{group.date}</span>
                    <span className="timeline-count">{group.photos.length}张</span>
                  </div>

                  <div className="photo-grid">
                    {group.photos.map((photo) => {
                      const flatIndex = getPhotoIndexInFlat(photo.id);
                      if (flatIndex < 0) return null;
                      return (
                        <Draggable
                          key={photo.id}
                          draggableId={photo.id}
                          index={flatIndex}
                          isDragDisabled={selectMode || !!filterTag}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.8 : 1
                              }}
                              className={`photo-grid-item ${snapshot.isDragging ? 'dragging' : ''}`}
                            >
                              <PhotoCard
                                photo={photo}
                                isSelected={selectedPhotoIds.includes(photo.id)}
                              />
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                  </div>
                </div>
              ))}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {!filterTag && (
        <div ref={observerRef} className="load-more-trigger">
          {loading && (
            <div className="skeleton-grid">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
          {!hasMore && !loading && displayPhotos.length > 0 && (
            <div className="no-more-text">— 已加载全部照片 —</div>
          )}
        </div>
      )}

      {displayPhotos.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <p>暂无照片</p>
        </div>
      )}
    </div>
  );
};

export default PhotoWall;
