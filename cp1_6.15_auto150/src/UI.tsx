import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore, MAX_HP, MAX_MP } from './GameState';
import { storyEngine, type Choice, type GameStatus } from './StoryEngine';
import { typewriterEffect, bounceInAnimation } from './AnimationUtils';
import './UI.css';

const getHpColor = (percent: number): string => {
  const green = { r: 76, g: 175, b: 80 };
  const red = { r: 244, g: 67, b: 54 };

  const r = Math.round(red.r + (green.r - red.r) * percent);
  const g = Math.round(red.g + (green.g - red.g) * percent);
  const b = Math.round(red.b + (green.b - red.b) * percent);

  return `rgb(${r}, ${g}, ${b})`;
};

interface StatusBarProps {
  hp: number;
  mp: number;
  inventory: { name: string; id: string }[];
  newlyAddedItem: string | null;
  clearNewlyAddedItem: () => void;
}

function StatusBar({ hp, mp, inventory, newlyAddedItem, clearNewlyAddedItem }: StatusBarProps) {
  const hpPercent = hp / MAX_HP;
  const hpColor = getHpColor(hpPercent);
  const mpPercent = mp / MAX_MP;

  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (newlyAddedItem) {
      const element = itemRefs.current.get(newlyAddedItem);
      if (element) {
        const cancel = bounceInAnimation({
          element,
          duration: 500
        });
        const timer = setTimeout(() => {
          clearNewlyAddedItem();
        }, 600);
        return () => {
          cancel();
          clearTimeout(timer);
        };
      }
    }
  }, [newlyAddedItem, clearNewlyAddedItem]);

  const displayItems = inventory.slice(0, 4);

  const getItemEmoji = (name: string): string => {
    const emojiMap: Record<string, string> = {
      '生锈短剑': '🗡️',
      '治疗药水': '🧪',
      '魔法宝石': '💎',
      '圣光护符': '📿',
      '圣光之剑': '⚔️'
    };
    return emojiMap[name] || '📦';
  };

  return (
    <div className="status-bar">
      <div className="status-character">
        <span className="character-name">勇者</span>
      </div>

      <div className="status-hp">
        <span className="status-label">HP</span>
        <div className="bar-container">
          <div
            className="bar-fill hp-bar"
            style={{
              width: `${hpPercent * 100}%`,
              backgroundColor: hpColor
            }}
          />
        </div>
        <span className="status-value">{hp}/{MAX_HP}</span>
      </div>

      <div className="status-mp">
        <span className="status-label">MP</span>
        <div className="bar-container">
          <div
            className="bar-fill mp-bar"
            style={{ width: `${mpPercent * 100}%` }}
          />
        </div>
        <span className="status-value">{mp}/{MAX_MP}</span>
      </div>

      <div className="inventory-bar">
        {displayItems.map((item) => (
          <div
            key={item.id}
            ref={(el) => {
              if (el) itemRefs.current.set(item.id, el);
            }}
            className="inventory-item"
            title={item.name}
          >
            <span className="item-emoji">{getItemEmoji(item.name)}</span>
          </div>
        ))}
        {displayItems.length === 0 && (
          <div className="inventory-empty">
            <span className="empty-text">空</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface DialogBoxProps {
  text: string;
  isTyping: boolean;
  onTypingComplete: () => void;
  nodeId: string;
}

function DialogBox({ text, isTyping, onTypingComplete, nodeId }: DialogBoxProps) {
  const [displayedText, setDisplayedText] = useState('');
  const typewriterRef = useRef<ReturnType<typeof typewriterEffect> | null>(null);

  useEffect(() => {
    setDisplayedText('');

    if (typewriterRef.current) {
      typewriterRef.current.cancel();
    }

    if (!isTyping) {
      setDisplayedText(text);
      onTypingComplete();
      return;
    }

    typewriterRef.current = typewriterEffect({
      text,
      speed: 80,
      onChar: (_, fullText) => {
        setDisplayedText(fullText);
      },
      onComplete: () => {
        onTypingComplete();
      }
    });

    return () => {
      if (typewriterRef.current) {
        typewriterRef.current.cancel();
      }
    };
  }, [text, isTyping, onTypingComplete, nodeId]);

  const formattedText = displayedText.split('\n').map((line, index) => (
    <span key={index}>
      {line}
      {index < displayedText.split('\n').length - 1 && <br />}
    </span>
  ));

  return (
    <div className="dialog-box">
      <div className="dialog-text">{formattedText}</div>
    </div>
  );
}

interface ChoiceButtonProps {
  choice: Choice;
  available: boolean;
  onClick: () => void;
  index: number;
  disabled: boolean;
}

function ChoiceButton({ choice, available, onClick, index, disabled }: ChoiceButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    if (!available || disabled) return;
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      onClick();
    }, 100);
  };

  return (
    <button
      className={`choice-button ${!available ? 'disabled' : ''} ${isPressed ? 'pressed' : ''}`}
      onClick={handleClick}
      disabled={!available || disabled}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {choice.text}
    </button>
  );
}

interface ChoicesListProps {
  choices: Choice[];
  onChoiceSelect: (choice: Choice) => void;
  status: GameStatus;
  disabled: boolean;
}

function ChoicesList({ choices, onChoiceSelect, status, disabled }: ChoicesListProps) {
  return (
    <div className="choices-list">
      {choices.map((choice, index) => {
        const available = storyEngine.isChoiceAvailable(choice, status);
        return (
          <ChoiceButton
            key={choice.id}
            choice={choice}
            available={available}
            onClick={() => onChoiceSelect(choice)}
            index={index}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}

interface EndingsCounterProps {
  unlocked: number;
  total: number;
}

function EndingsCounter({ unlocked, total }: EndingsCounterProps) {
  return (
    <div className="endings-counter">
      已发现 {unlocked}/{total} 个结局
    </div>
  );
}

function GameUI() {
  const {
    hp,
    mp,
    inventory,
    currentNodeId,
    unlockedEndings,
    newlyAddedItem,
    setCurrentNodeId,
    applyStatusChanges,
    unlockEnding,
    clearNewlyAddedItem,
    resetGame
  } = useGameStore();

  const [isTyping, setIsTyping] = useState(true);
  const [showChoices, setShowChoices] = useState(false);
  const [key, setKey] = useState(0);

  const currentNode = storyEngine.getNode(currentNodeId);

  const gameStatus: GameStatus = {
    hp,
    mp,
    inventory: inventory.map(item => item.name)
  };

  const handleTypingComplete = useCallback(() => {
    setIsTyping(false);
    setShowChoices(true);
  }, []);

  const handleChoiceSelect = useCallback((choice: Choice) => {
    setShowChoices(false);
    setIsTyping(true);
    setKey(prev => prev + 1);

    const { nextNodeId, statusChanges } = storyEngine.processChoice(choice, gameStatus);

    applyStatusChanges(statusChanges);

    setTimeout(() => {
      const nextNode = storyEngine.getNode(nextNodeId);

      if (nextNode?.isEnding && nextNode.endingType) {
        unlockEnding(nextNode.endingType);
      }

      if (nextNodeId === 'dragon_fight_holy' && storyEngine.checkHiddenEnding(useGameStore.getState())) {
        const hiddenNode = storyEngine.getHiddenEndingNode();
        if (hiddenNode) {
          setCurrentNodeId('hidden_ending');
          unlockEnding('hidden');
          return;
        }
      }

      setCurrentNodeId(nextNodeId);
    }, 50);
  }, [gameStatus, applyStatusChanges, setCurrentNodeId, unlockEnding]);

  const handleRestart = () => {
    resetGame();
    setIsTyping(true);
    setShowChoices(false);
    setKey(prev => prev + 1);
  };

  const totalEndings = storyEngine.getTotalEndings();

  if (!currentNode) {
    return <div>加载中...</div>;
  }

  return (
    <div className="game-container">
      <StatusBar
        hp={hp}
        mp={mp}
        inventory={inventory}
        newlyAddedItem={newlyAddedItem}
        clearNewlyAddedItem={clearNewlyAddedItem}
      />

      <div className="particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 2}px`,
              height: `${2 + Math.random() * 2}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="main-content">
        <DialogBox
          key={`dialog-${key}`}
          text={currentNode.text}
          isTyping={isTyping}
          onTypingComplete={handleTypingComplete}
          nodeId={currentNodeId}
        />

        {showChoices && currentNode.choices.length > 0 && (
          <ChoicesList
            choices={currentNode.choices}
            onChoiceSelect={handleChoiceSelect}
            status={gameStatus}
            disabled={isTyping}
          />
        )}

        {currentNode.isEnding && showChoices === false && isTyping === false && (
          <div className="ending-section">
            <button className="restart-button" onClick={handleRestart}>
              重新开始
            </button>
          </div>
        )}

        <EndingsCounter
          unlocked={unlockedEndings.length}
          total={totalEndings}
        />
      </div>
    </div>
  );
}

export default GameUI;
