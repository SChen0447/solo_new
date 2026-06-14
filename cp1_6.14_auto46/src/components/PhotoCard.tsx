import { usePhotoStore } from '../store'
import type { Photo } from '../types'

interface PhotoCardProps {
  photo: Photo
  index: number
  categoryName?: string
}

export default function PhotoCard({ photo, index, categoryName }: PhotoCardProps) {
  const openSlideshow = usePhotoStore((state) => state.openSlideshow)

  const handleClick = () => {
    openSlideshow(photo)
  }

  return (
    <div
      className="photo-card"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={handleClick}
    >
      <div className="photo-card__image-wrapper">
        <img
          src={photo.thumbnailUrl}
          alt={photo.title}
          className="photo-card__image"
          loading="lazy"
        />
        <div className="photo-card__overlay">
          <span className="photo-card__view-text">查看大图</span>
        </div>
      </div>
      <div className="photo-card__info">
        <h3 className="photo-card__title">{photo.title}</h3>
        {categoryName && (
          <span className="photo-card__category">{categoryName}</span>
        )}
      </div>

      <style>{`
        .photo-card {
          background: #2d2d2d;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          animation: fadeInUp 0.6s ease forwards;
          opacity: 0;
        }

        .photo-card:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .photo-card__image-wrapper {
          position: relative;
          width: 100%;
          padding-top: 100%;
          overflow: hidden;
        }

        .photo-card__image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-card__overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(212, 175, 55, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .photo-card:hover .photo-card__overlay {
          opacity: 1;
        }

        .photo-card__view-text {
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 1px;
        }

        .photo-card__info {
          padding: 12px 16px;
        }

        .photo-card__title {
          margin: 0 0 6px 0;
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .photo-card__category {
          font-size: 12px;
          color: #d4af37;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
