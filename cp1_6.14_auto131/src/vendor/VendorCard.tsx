import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Vendor } from '@/types';
import {
  getInitials,
  getCountdownText,
  getCategoryIcon,
  getStatusBadgeClass,
  formatDate,
  maskIdCard,
  maskPhone,
} from '@/utils/format';

interface VendorCardProps {
  vendor: Vendor;
  onAddPatrol?: (vendor: Vendor) => void;
  onReport?: (vendor: Vendor) => void;
}

function createRipple(event: React.MouseEvent<HTMLButtonElement>) {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - (button.offsetLeft + radius)}px`;
  circle.style.top = `${event.clientY - (button.offsetTop + radius)}px`;
  circle.classList.add('ripple-effect');

  const existingRipple = button.getElementsByClassName('ripple-effect')[0];
  if (existingRipple) {
    existingRipple.remove();
  }

  button.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

export default function VendorCard({ vendor, onAddPatrol, onReport }: VendorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const countdown = getCountdownText(vendor.endDate);
  const initials = getInitials(vendor.name);

  return (
    <div
      className="card overflow-hidden animate-fade-in cursor-pointer group"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4 transition-all duration-200 group-hover:bg-cream-50">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0"
            style={{ backgroundColor: vendor.avatarColor || '#FF9F43' }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-dark-brown-800 text-lg truncate">
                {vendor.name}
              </h3>
              <span className={`badge ${getStatusBadgeClass(vendor.status)}`}>
                {vendor.status}
              </span>
              <span className="badge badge-info">
                {getCategoryIcon(vendor.category)} {vendor.category}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-dark-brown-500 flex-wrap">
              <span className="font-mono bg-cream-100 px-2 py-0.5 rounded text-warm-orange-700">
                {vendor.stallNumber}
              </span>
              <span>📞 {maskPhone(vendor.phone)}</span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div
              className={`text-2xl font-bold tabular-nums ${
                countdown.expired
                  ? 'text-dark-brown-400'
                  : countdown.urgent
                  ? 'text-red-500 animate-blink'
                  : 'text-warm-orange-600'
              }`}
            >
              {countdown.text}
            </div>
            <div className="text-xs text-dark-brown-400 mt-0.5">
              {countdown.expired ? '有效期' : '剩余'}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-cream-200 animate-slide-down">
            <div className="gradient-vendor-card rounded-xl p-5 -m-1 mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🆔</span>
                  <div>
                    <div className="text-xs text-dark-brown-500 mb-0.5">身份证号</div>
                    <div className="font-mono text-sm text-dark-brown-800">
                      {maskIdCard(vendor.idCard)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xl">📱</span>
                  <div>
                    <div className="text-xs text-dark-brown-500 mb-0.5">联系电话</div>
                    <div className="font-mono text-sm text-dark-brown-800">{vendor.phone}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xl">📍</span>
                  <div>
                    <div className="text-xs text-dark-brown-500 mb-0.5">摊位位置</div>
                    <div className="text-sm text-dark-brown-800">
                      {vendor.location.address ||
                        `${vendor.location.lat.toFixed(4)}, ${vendor.location.lng.toFixed(4)}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xl">🎯</span>
                  <div>
                    <div className="text-xs text-dark-brown-500 mb-0.5">经营品类</div>
                    <div className="text-sm text-dark-brown-800">
                      {getCategoryIcon(vendor.category)} {vendor.category}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xl">📅</span>
                  <div>
                    <div className="text-xs text-dark-brown-500 mb-0.5">备案开始</div>
                    <div className="text-sm text-dark-brown-800">{formatDate(vendor.startDate)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className={`text-xl ${countdown.urgent && !countdown.expired ? 'animate-bounce' : ''}`}>
                    ⏰
                  </span>
                  <div>
                    <div className="text-xs text-dark-brown-500 mb-0.5">备案到期</div>
                    <div
                      className={`text-sm font-medium ${
                        countdown.expired
                          ? 'text-dark-brown-400'
                          : countdown.urgent
                          ? 'text-red-600'
                          : 'text-dark-brown-800'
                      }`}
                    >
                      {formatDate(vendor.endDate)}
                      {countdown.urgent && !countdown.expired && (
                        <span className="ml-2 text-red-500 animate-blink">⚠ 即将到期</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-warm-orange-200/50 flex flex-wrap gap-3">
                <Link
                  to={`/vendor/${vendor.id}`}
                  className="btn-primary flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    createRipple(e as React.MouseEvent<HTMLButtonElement>);
                  }}
                >
                  <span>📋</span> 查看详情
                </Link>
                <button
                  className="btn-secondary flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    createRipple(e);
                    onAddPatrol?.(vendor);
                  }}
                >
                  <span>🔍</span> 新增巡查
                </button>
                <button
                  className="btn-danger flex items-center gap-2 ml-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    createRipple(e);
                    onReport?.(vendor);
                  }}
                >
                  <span>⚠️</span> 举报违规
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
