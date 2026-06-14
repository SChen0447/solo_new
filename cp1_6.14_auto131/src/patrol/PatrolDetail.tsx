import { useState } from 'react';
import type { Patrol } from '@/types';
import {
  formatDateTime,
  getPatrolStatusColor,
  getStatusBadgeClass,
} from '@/utils/format';

interface PatrolDetailProps {
  patrol: Patrol;
  onHandleViolation?: (patrol: Patrol) => void;
  compact?: boolean;
}

export default function PatrolDetail({
  patrol,
  onHandleViolation,
  compact = false,
}: PatrolDetailProps) {
  const [expanded, setExpanded] = useState(compact ? false : true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [hoveredPhoto, setHoveredPhoto] = useState<string | null>(null);

  const statusColor = getPatrolStatusColor(patrol.status);
  const badgeClass = getStatusBadgeClass(
    patrol.status === '正常'
      ? '有效'
      : patrol.status === '轻微违规'
      ? '过期'
      : '吊销'
  );

  return (
    <div
      className={`bg-white rounded-xl border border-cream-200 overflow-hidden transition-all duration-300 hover:shadow-soft-hover ${
        compact ? 'cursor-pointer' : ''
      }`}
      onClick={() => compact && setExpanded(!expanded)}
    >
      <div className="flex">
        <div className={`w-1.5 ${statusColor} flex-shrink-0`} />

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`badge ${badgeClass}`}>{patrol.status}</span>
              <span className="text-sm text-dark-brown-600">
                🕐 {formatDateTime(patrol.patrolTime)}
              </span>
              <span className="text-sm text-dark-brown-600">
                👮 {patrol.inspectorName}
              </span>
            </div>

            {patrol.hasRevoked && (
              <span className="badge badge-danger">📛 已吊销备案</span>
            )}
          </div>

          {expanded && (
            <div className="mt-4 space-y-4 animate-slide-down">
              {(patrol.violationDesc || patrol.status !== '正常') && (
                <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {patrol.violationDesc && (
                      <div className="flex items-start gap-2">
                        <span className="text-lg">📝</span>
                        <div>
                          <div className="text-xs text-dark-brown-500 mb-0.5">违规描述</div>
                          <div
                            className={`text-sm ${
                              patrol.status === '严重违规'
                                ? 'text-red-700 font-medium'
                                : 'text-yellow-700'
                            }`}
                          >
                            {patrol.violationDesc}
                          </div>
                        </div>
                      </div>
                    )}

                    {patrol.rectificationReq && (
                      <div className="flex items-start gap-2">
                        <span className="text-lg">✅</span>
                        <div>
                          <div className="text-xs text-dark-brown-500 mb-0.5">整改要求</div>
                          <div className="text-sm text-dark-brown-700">
                            {patrol.rectificationReq}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {patrol.photos && patrol.photos.length > 0 && (
                <div>
                  <div className="text-xs text-dark-brown-500 mb-2 flex items-center gap-1">
                    <span>📷</span> 现场照片 ({patrol.photos.length})
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {patrol.photos.map(photo => (
                      <div
                        key={photo.id}
                        className="relative group"
                        onMouseEnter={() => setHoveredPhoto(photo.id)}
                        onMouseLeave={() => setHoveredPhoto(null)}
                      >
                        <img
                          src={photo.url}
                          alt={photo.name}
                          className={`w-24 h-24 md:w-28 md:h-28 object-cover rounded-lg border-2 border-cream-200 cursor-pointer transition-all duration-300 ${
                            hoveredPhoto === photo.id
                              ? 'scale-110 shadow-lg z-10 border-warm-orange-300'
                              : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(photo.url);
                          }}
                        />
                        {hoveredPhoto === photo.id && (
                          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-dark-brown-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 animate-fade-in pointer-events-none">
                            点击查看原图
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {patrol.status !== '正常' && onHandleViolation && !patrol.hasRevoked && (
                <div className="pt-3 border-t border-cream-200 flex justify-end">
                  <button
                    className={`${
                      patrol.status === '严重违规' ? 'btn-danger' : 'btn-secondary'
                    } flex items-center gap-2`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onHandleViolation(patrol);
                    }}
                  >
                    {patrol.status === '严重违规' ? (
                      <>
                        <span>📛</span> 处理违规（可吊销）
                      </>
                    ) : (
                      <>
                        <span>📋</span> 查看整改要求
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl max-h-full">
            <img
              src={previewImage}
              alt="原图"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors"
              onClick={() => setPreviewImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
