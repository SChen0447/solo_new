import { useState, useEffect, useCallback, useRef } from 'react'
import { usePhotoStore } from '../store'
import type { Photo } from '../types'

export default function Slideshow() {
  const { isSlideshowOpen, closeSlideshow, currentPhoto, photos } = usePhotoStore()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const preloadedRef = useRef<Set<string>>(new Set())

  const currentPhotoList = photos

  useEffect(() => {
    if (currentPhoto && currentPhotoList.length > 0) {
      const idx = currentPhotoList.findIndex((p) => p.id === currentPhoto.id)
      if (idx !== -1) {
        setCurrentIndex(idx)
      }
    }
  }, [currentPhoto, currentPhotoList])

  const preloadImages = useCallback(
    (index: number) => {
      const total = currentPhotoList.length
      if (total === 0) return

      const prevIndex = (index - 1 + total) % total
      const nextIndex = (index + 1) % total

      ;[prevIndex, nextIndex].forEach((i) => {
        const photo = currentPhotoList[i]
        if (photo && !preloadedRef.current.has(photo.id)) {
          preloadedRef.current.add(photo.id)
          const img = new Image()
          img.src = photo.imageUrl
        }
      })
    },
    [currentPhotoList]
  )

  useEffect(() => {
    if (isSlideshowOpen) {
      preloadImages(currentIndex)
    }
  }, [currentIndex, isSlideshowOpen, preloadImages])

  const goToNext = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => {
      const next = (prev + 1) % currentPhotoList.length
      preloadImages(next)
      return next
    })
    setTimeout(() => setIsTransitioning(false), 500)
  }, [currentPhotoList.length, isTransitioning, preloadImages])

  const goToPrev = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => {
      const next = (prev - 1 + currentPhotoList.length) % currentPhotoList.length
      preloadImages(next)
      return next
    })
    setTimeout(() => setIsTransitioning(false), 500)
  }, [currentPhotoList.length, isTransitioning, preloadImages])

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  const handleClose = useCallback(() => {
    closeSlideshow()
    setIsPlaying(false)
  }, [closeSlideshow])

  useEffect(() => {
    if (!isSlideshowOpen || !isPlaying) return

    const interval = setInterval(() => {
      goToNext()
    }, 5000)

    return () => clearInterval(interval)
  }, [isSlideshowOpen, isPlaying, goToNext])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSlideshowOpen) return

      switch (e.key) {
        case 'Escape':
          handleClose()
          break
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowRight':
          goToNext()
          break
        case 'ArrowLeft':
          goToPrev()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSlideshowOpen, handleClose, togglePlay, goToNext, goToPrev])

  if (!isSlideshowOpen || currentPhotoList.length === 0) return null

  const photo = currentPhotoList[currentIndex]

  return (
    <div className="slideshow" onClick={handleClose}>
      <div className="slideshow__content" onClick={(e) => e.stopPropagation()}>
        <button className="slideshow__close" onClick={handleClose}>
          ×
        </button>

        <button className="slideshow__nav slideshow__nav--prev" onClick={goToPrev}>
          ‹
        </button>

        <div className="slideshow__image-container">
          <img
            key={photo.id}
            src={photo.imageUrl}
            alt={photo.title}
            className="slideshow__image"
          />
        </div>

        <button className="slideshow__nav slideshow__nav--next" onClick={goToNext}>
          ›
        </button>

        <button className="slideshow__play-toggle" onClick={togglePlay}>
          {isPlaying ? '⏸ 暂停' : '▶ 播放'}
        </button>

        <div className="slideshow__info">
          <h2 className="slideshow__title">{photo.title}</h2>
          <div className="slideshow__params">
            <span>{photo.cameraModel}</span>
            <span>·</span>
            <span>f/{photo.aperture}</span>
            <span>·</span>
            <span>{photo.shutterSpeed}s</span>
            <span>·</span>
            <span>ISO {photo.iso}</span>
          </div>
          <div className="slideshow__counter">
            {currentIndex + 1} / {currentPhotoList.length}
          </div>
        </div>
      </div>

      <style>{`
        .slideshow {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.95);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .slideshow__content {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .slideshow__close {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 48px;
          height: 48px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 32px;
          cursor: pointer;
          z-index: 10;
          transition: background 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .slideshow__close:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .slideshow__nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 56px;
          height: 56px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 36px;
          cursor: pointer;
          z-index: 10;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .slideshow__nav:hover {
          background: rgba(212, 175, 55, 0.8);
          transform: translateY(-50%) scale(1.1);
        }

        .slideshow__nav--prev {
          left: 24px;
        }

        .slideshow__nav--next {
          right: 24px;
        }

        .slideshow__image-container {
          max-width: 90vw;
          max-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .slideshow__image {
          max-width: 100%;
          max-height: 80vh;
          object-fit: contain;
          animation: fadeInImage 0.5s ease;
        }

        @keyframes fadeInImage {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .slideshow__play-toggle {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 24px;
          border: 1px solid #d4af37;
          border-radius: 999px;
          background: transparent;
          color: #d4af37;
          font-size: 14px;
          cursor: pointer;
          z-index: 10;
          transition: all 0.3s ease;
        }

        .slideshow__play-toggle:hover {
          background: #d4af37;
          color: #1a1a1a;
        }

        .slideshow__info {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          color: #fff;
        }

        .slideshow__title {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 500;
        }

        .slideshow__params {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          color: #cccccc;
          margin-bottom: 8px;
        }

        .slideshow__counter {
          font-size: 13px;
          color: #d4af37;
        }

        @media (max-width: 768px) {
          .slideshow__nav {
            width: 44px;
            height: 44px;
            font-size: 28px;
          }
          .slideshow__nav--prev { left: 12px; }
          .slideshow__nav--next { right: 12px; }
          .slideshow__close {
            top: 16px;
            right: 16px;
            width: 40px;
            height: 40px;
            font-size: 28px;
          }
          .slideshow__title {
            font-size: 16px;
          }
          .slideshow__params {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
}
