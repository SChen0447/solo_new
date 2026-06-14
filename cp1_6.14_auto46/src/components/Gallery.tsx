import { useEffect, useRef, useCallback } from 'react'
import { usePhotoStore } from '../store'
import PhotoCard from './PhotoCard'

export default function Gallery() {
  const {
    photos,
    total,
    categories,
    selectedCategoryIds,
    isLoading,
    fetchPhotos,
    fetchMorePhotos,
    fetchCategories,
    toggleCategory
  } = usePhotoStore()

  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos, selectedCategoryIds])

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target.isIntersecting && !isLoading && photos.length < total) {
        fetchMorePhotos()
      }
    },
    [isLoading, photos.length, total, fetchMorePhotos]
  )

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: '100px',
      threshold: 0
    }
    const observer = new IntersectionObserver(handleObserver, option)
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [handleObserver, photos.length])

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name
  }

  return (
    <div className="gallery">
      <div className="gallery__filters">
        {categories.map((category) => {
          const isSelected = selectedCategoryIds.includes(category.id)
          return (
            <button
              key={category.id}
              className={`gallery__filter-tag ${isSelected ? 'is-active' : ''}`}
              style={{
                backgroundColor: isSelected ? category.color : 'transparent',
                borderColor: category.color,
                color: isSelected ? '#1a1a1a' : category.color
              }}
              onClick={() => toggleCategory(category.id)}
            >
              {category.name}
            </button>
          )
        })}
      </div>

      <div className="gallery__grid">
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            index={index}
            categoryName={getCategoryName(photo.categoryId)}
          />
        ))}
      </div>

      <div ref={loadMoreRef} className="gallery__load-more">
        {isLoading && <div className="gallery__spinner">加载中...</div>}
      </div>

      {photos.length === 0 && !isLoading && (
        <div className="gallery__empty">暂无作品</div>
      )}

      <style>{`
        .gallery {
          width: 100%;
        }

        .gallery__filters {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 32px;
          justify-content: center;
        }

        .gallery__filter-tag {
          padding: 8px 20px;
          border: 2px solid;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          background: transparent;
          position: relative;
        }

        .gallery__filter-tag:hover {
          transform: translateY(-2px);
        }

        .gallery__filter-tag.is-active::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 2px;
          background: currentColor;
          animation: underlineIn 0.3s ease;
        }

        @keyframes underlineIn {
          from {
            width: 0;
            opacity: 0;
          }
          to {
            width: 60%;
            opacity: 1;
          }
        }

        .gallery__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        @media (min-width: 768px) {
          .gallery__grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1200px) {
          .gallery__grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .gallery__load-more {
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 20px;
        }

        .gallery__spinner {
          color: #cccccc;
          font-size: 14px;
        }

        .gallery__empty {
          text-align: center;
          padding: 60px 0;
          color: #cccccc;
          font-size: 16px;
        }
      `}</style>
    </div>
  )
}
