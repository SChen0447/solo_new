import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import type { Pokemon, ElementType } from '@/types';
import { elementColors, elementNames, elementIcons } from '@/data/elementStats';

interface PokemonCardProps {
  pokemon: Pokemon;
  isShaking?: boolean;
  isSelected?: boolean;
  isFlipped?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  showBackSkills?: boolean;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

const generateStars = (count: number): Star[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 3,
    delay: Math.random() * 3,
    duration: 1.5 + Math.random() * 2,
  }));
};

const CardContainer = styled(motion.div)<{ $type: ElementType; $size: string; $selected: boolean }>`
  position: relative;
  width: ${(props) => (props.$size === 'small' ? '180px' : props.$size === 'large' ? '320px' : '240px')};
  height: ${(props) => (props.$size === 'small' ? '260px' : props.$size === 'large' ? '440px' : '340px')};
  perspective: 1000px;
  cursor: ${(props) => (props.onClick ? 'pointer' : 'default')};
`;

const CardInner = styled(motion.div)<{ $flipped: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s;
`;

const CardFace = styled.div<{ $type: ElementType }>`
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 16px;
  overflow: hidden;
  background: ${(props) =>
    `linear-gradient(135deg, ${elementColors[props.$type].from} 0%, ${elementColors[props.$type].to} 100%)`};
  box-shadow: ${(props) =>
    `0 4px 24px ${elementColors[props.$type].glow}, inset 0 1px 0 rgba(255,255,255,0.2)`};
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const CardFront = styled(CardFace)`
  display: flex;
  flex-direction: column;
`;

const CardBack = styled(CardFace)`
  transform: rotateY(180deg);
  display: flex;
  flex-direction: column;
`;

const StarParticle = styled.div<{ $star: Star }>`
  position: absolute;
  width: ${(props) => props.$star.size}px;
  height: ${(props) => props.$star.size}px;
  left: ${(props) => props.$star.x}%;
  top: ${(props) => props.$star.y}%;
  background: white;
  border-radius: 50%;
  animation: twinkle ${(props) => props.$star.duration}s ease-in-out infinite;
  animation-delay: ${(props) => props.$star.delay}s;
  pointer-events: none;

  @keyframes twinkle {
    0%,
    100% {
      opacity: 0.2;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.5);
    }
  }
`;

const GlassOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: none;
`;

const CardContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  color: white;
`;

const PokemonName = styled.div<{ $size: string }>`
  font-size: ${(props) => (props.$size === 'small' ? '16px' : props.$size === 'large' ? '28px' : '20px')};
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  margin-bottom: 8px;
`;

const TypeBadge = styled.div<{ $type: ElementType; $size: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: ${(props) => (props.$size === 'small' ? '4px 10px' : '6px 14px')};
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
  border-radius: 20px;
  font-size: ${(props) => (props.$size === 'small' ? '12px' : '14px')};
  font-weight: 600;
  margin-bottom: 12px;
  align-self: flex-start;
`;

const StatsContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
`;

const StatBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StatLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const StatBarBg = styled.div`
  height: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  overflow: hidden;
`;

const HpBarFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #ff6b6b, #ffd93d);
  border-radius: 5px;
`;

const AtkBarFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #ff9f43, #feca57);
  border-radius: 5px;
`;

const SkillsList = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 16px;
`;

const SkillThumbnail = styled.div<{ $type: ElementType }>`
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SkillPower = styled.span`
  font-size: 11px;
  opacity: 0.8;
`;

const EmptySkills = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
`;

const CardBackTitle = styled.div`
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
`;

const ShakingContainer = styled(motion.div)`
  width: 100%;
  height: 100%;
`;

const PokemonCard: React.FC<PokemonCardProps> = ({
  pokemon,
  isShaking = false,
  isSelected = false,
  isFlipped = false,
  size = 'medium',
  onClick,
  showBackSkills = false,
}) => {
  const stars = useMemo(() => generateStars(20), []);

  const hpPercentage = (pokemon.hp / pokemon.maxHp) * 100;
  const atkPercentage = Math.min(100, (pokemon.attack / 120) * 100);

  const shakeVariants = {
    shake: {
      x: [0, -8, 8, -8, 8, 0],
      transition: { duration: 0.2, ease: 'easeInOut' },
    },
    idle: { x: 0 },
  };

  return (
    <CardContainer
      $type={pokemon.type}
      $size={size}
      $selected={isSelected}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.03, y: -4 } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
    >
      <CardInner $flipped={isFlipped || showBackSkills}>
        <CardFront $type={pokemon.type}>
          {stars.map((star) => (
            <StarParticle key={star.id} $star={star} />
          ))}
          <GlassOverlay />
          <CardContent>
            <PokemonName $size={size}>{pokemon.name}</PokemonName>
            <TypeBadge $type={pokemon.type} $size={size}>
              <span>{elementIcons[pokemon.type]}</span>
              <span>{elementNames[pokemon.type]}属性</span>
            </TypeBadge>
            <StatsContainer>
              <StatBar>
                <StatLabel>
                  <span>HP</span>
                  <span>
                    {pokemon.hp}/{pokemon.maxHp}
                  </span>
                </StatLabel>
                <StatBarBg>
                  <HpBarFill
                    initial={false}
                    animate={{ width: `${hpPercentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </StatBarBg>
              </StatBar>
              <StatBar>
                <StatLabel>
                  <span>攻击</span>
                  <span>{pokemon.attack}</span>
                </StatLabel>
                <StatBarBg>
                  <AtkBarFill
                    initial={false}
                    animate={{ width: `${atkPercentage}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </StatBarBg>
              </StatBar>
              {size !== 'small' && (
                <StatBar>
                  <StatLabel>
                    <span>防御</span>
                    <span>{pokemon.defense}</span>
                  </StatLabel>
                  <StatBarBg>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (pokemon.defense / 120) * 100)}%`,
                        background: 'linear-gradient(90deg, #54a0ff, #5f27cd)',
                        borderRadius: '5px',
                      }}
                    />
                  </StatBarBg>
                </StatBar>
              )}
              {size !== 'small' && (
                <StatBar>
                  <StatLabel>
                    <span>速度</span>
                    <span>{pokemon.speed}</span>
                  </StatLabel>
                  <StatBarBg>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (pokemon.speed / 120) * 100)}%`,
                        background: 'linear-gradient(90deg, #00d2d3, #54a0ff)',
                        borderRadius: '5px',
                      }}
                    />
                  </StatBarBg>
                </StatBar>
              )}
            </StatsContainer>
          </CardContent>
        </CardFront>

        <CardBack $type={pokemon.type}>
          {stars.map((star) => (
            <StarParticle key={`back-${star.id}`} $star={star} />
          ))}
          <GlassOverlay />
          <CardBackTitle>技能配置</CardBackTitle>
          {pokemon.skills.length > 0 ? (
            <SkillsList>
              {pokemon.skills.map((skill) => (
                <SkillThumbnail key={skill.id} $type={skill.type}>
                  <span>
                    {elementIcons[skill.type]} {skill.name}
                  </span>
                  <SkillPower>威力 {skill.power}</SkillPower>
                </SkillThumbnail>
              ))}
            </SkillsList>
          ) : (
            <EmptySkills>暂无技能配置</EmptySkills>
          )}
        </CardBack>
      </CardInner>

      <AnimatePresence>
        {isShaking && (
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
            }}
            initial={{ opacity: 0.8 }}
            animate={{
              x: [0, -8, 8, -8, 8, 0],
              opacity: [0.8, 0.6, 0.8, 0.6, 0.8, 0],
            }}
            transition={{ duration: 0.4 }}
            exit={{ opacity: 0 }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '16px',
                boxShadow: `0 0 30px ${elementColors[pokemon.type].glow}`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isSelected && (
        <motion.div
          style={{
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: '20px',
            border: `3px solid ${elementColors[pokemon.type].text}`,
            pointerEvents: 'none',
          }}
          animate={{
            boxShadow: [
              `0 0 10px ${elementColors[pokemon.type].glow}`,
              `0 0 25px ${elementColors[pokemon.type].glow}`,
              `0 0 10px ${elementColors[pokemon.type].glow}`,
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </CardContainer>
  );
};

export default PokemonCard;
