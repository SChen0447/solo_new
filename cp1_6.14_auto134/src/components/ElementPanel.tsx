import React, { useState, useCallback, useEffect } from 'react';
import { useSpring, animated } from 'react-spring';
import { useStore } from '../store';
import type { Element } from '../types';

interface DraggingCardProps {
  element: Element;
  position: { x: number; y: number };
}

const DraggingCard: React.FC<DraggingCardProps> = ({ element, position }) => {
  const props = useSpring({
    left: position.x - 50,
    top: position.y - 50,
    scale: 1.1,
    config: { tension: 500, friction: 20 },
  });

  return (
    <animated.div
      className="element-card dragging"
      style={{
        ...props,
        width: '100px',
        background: `linear-gradient(135deg, ${element.color}22 0%, ${element.color}44 100%)`,
        borderColor: element.color,