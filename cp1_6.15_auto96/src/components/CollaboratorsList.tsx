import React, { useState, useEffect } from 'react';
import { useRecipeStore, User, getColorForUser, getInitials } from '../store/recipeStore';

interface CollaboratorsListProps {
  maxVisible?: number;
}

const CollaboratorsList: React.FC<CollaboratorsListProps> = ({ maxVisible = 6 }) => {
  const { users, currentUserId } = useRecipeStore();
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());
  const [prevUserIds, setPrevUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(users.map(u => u.id));
    const removedIds = new Set(
      [...prevUserIds].filter(id => !currentIds.has(id) && id !== currentUserId)
    );

    if (removedIds.size > 0) {
      setFadingOutIds(removedIds);
      setTimeout(() => {
        setFadingOutIds(new Set());
      }, 500);
    }

    setPrevUserIds(currentIds);
  }, [users, currentUserId, prevUserIds]);

  const visibleUsers = users.slice(0, maxVisible);
  const extraCount = Math.max(0, users.length - maxVisible);

  const allVisibleUsers = [
    ...visibleUsers,
    ...users.filter(u => fadingOutIds.has(u.id)),
  ];

  const uniqueUsers = Array.from(
    new Map(allVisibleUsers.map(u => [u.id, u])).values()
  );

  return (
    <div className="collaborators-list">
      <div className="avatars-container">
        {uniqueUsers.map((user) => {
          const isFadingOut = fadingOutIds.has(user.id);
          const isCurrentUser = user.id === currentUserId;
          const isEditing = user.isEditing;

          return (
            <div
              key={user.id}
              className={`avatar-wrapper ${isFadingOut ? 'fade-out' : ''} ${isEditing ? 'editing' : ''}`}
              title={`${user.name}${isCurrentUser ? ' (你)' : ''}`}
            >
              <div
                className={`avatar ${isEditing ? 'pulse-ring' : ''}`}
                style={{
                  backgroundColor: getColorForUser(user.id),
                }}
              >
                <span className="avatar-initials">
                  {getInitials(user.name)}
                </span>
              </div>
              {isCurrentUser && (
                <span className="current-user-badge">你</span>
              )}
            </div>
          );
        })}

        {extraCount > 0 && (
          <div className="avatar-wrapper extra-avatars" title={`还有 ${extraCount} 位协作者`}>
            <div className="avatar extra-avatar">
              <span className="avatar-initials">+{extraCount}</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .collaborators-list {
          display: flex;
          align-items: center;
        }

        .avatars-container {
          display: flex;
          align-items: center;
        }

        .avatar-wrapper {
          position: relative;
          margin-left: -8px;
          transition: opacity 0.5s ease, transform 0.5s ease;
          opacity: 1;
          transform: translateY(0);
        }

        .avatar-wrapper:first-child {
          margin-left: 0;
        }

        .avatar-wrapper.fade-out {
          opacity: 0;
          transform: translateY(-10px);
        }

        .avatar-wrapper.editing .avatar {
          animation: pulseBorder 1.5s ease-in-out infinite;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-sizing: border-box;
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }

        .avatar.pulse-ring {
          position: relative;
        }

        .avatar.pulse-ring::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 50%;
          border: 2px solid currentColor;
          opacity: 0.5;
          animation: pulseRing 1.5s ease-in-out infinite;
        }

        @keyframes pulseRing {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }

        @keyframes pulseBorder {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(121, 85, 72, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(121, 85, 72, 0);
          }
        }

        .avatar-initials {
          color: white;
          font-size: 14px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .extra-avatar {
          background-color: #9e9e9e;
        }

        .extra-avatars {
          margin-left: -8px;
        }

        .current-user-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          background-color: #4caf50;
          color: white;
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 8px;
          font-weight: bold;
          border: 1px solid white;
        }

        @media (max-width: 768px) {
          .avatar {
            width: 32px;
            height: 32px;
          }

          .avatar-initials {
            font-size: 12px;
          }

          .current-user-badge {
            font-size: 8px;
            padding: 1px 3px;
          }
        }
      `}</style>
    </div>
  );
};

export default CollaboratorsList;
