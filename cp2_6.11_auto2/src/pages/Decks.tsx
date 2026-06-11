import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2, ArrowLeft, X } from 'lucide-react'
import { useAppStore, type Card, type Deck } from '@/store'
import FlashCard from '@/components/FlashCard'
import { cn } from '@/lib/utils'

interface SortableItemProps {
  card: Card
  isSelected: boolean
  isFlipped: boolean
  onToggleSelect: () => void
  onDelete: () => void
  onFlip: () => void
}

function SortableItem({
  card,
  isSelected,
  isFlipped,
  onToggleSelect,
  onDelete,
  onFlip,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-xl shadow-md p-4 mb-3 flex items-center gap-3',
        'transition-all duration-200',
        isDragging && 'opacity-50 shadow-lg scale-[1.02] z-10'
      )}
    >
      <button
        className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={20} />
      </button>

      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      />

      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onFlip}
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-gray-800 truncate">
            {card.question}
          </p>
          {isFlipped ? (
            <p className="text-sm text-accent truncate bg-lightYellow px-2 py-1 rounded">
              {card.answer}
            </p>
          ) : (
            <p className="text-sm text-gray-400 truncate">
              点击查看答案
            </p>
          )}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="text-red-400 hover:text-red-600 p-1 btn-press"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}

export default function Decks() {
  const {
    decks,
    loading,
    fetchDecks,
    createDeck,
    deleteDeck,
    addCard,
    deleteCard,
    reorderCards,
  } = useAppStore()

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [showDeckModal, setShowDeckModal] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([])
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const [newDeckName, setNewDeckName] = useState('')
  const [newDeckDesc, setNewDeckDesc] = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchDecks()
  }, [fetchDecks])

  const selectedDeck = decks.find((d) => d.id === selectedDeckId)

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return
    await createDeck(newDeckName.trim(), newDeckDesc.trim())
    setNewDeckName('')
    setNewDeckDesc('')
    setShowDeckModal(false)
  }

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('确定要删除这个卡组吗？')) return
    await deleteDeck(deckId)
    if (selectedDeckId === deckId) {
      setSelectedDeckId(null)
    }
  }

  const handleAddCard = async () => {
    if (!selectedDeckId || !newQuestion.trim() || !newAnswer.trim()) return
    await addCard(selectedDeckId, newQuestion.trim(), newAnswer.trim())
    setNewQuestion('')
    setNewAnswer('')
    setShowCardModal(false)
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!selectedDeckId || !confirm('确定要删除这张卡片吗？')) return
    await deleteCard(selectedDeckId, cardId)
    setSelectedCardIds((prev) => prev.filter((id) => id !== cardId))
  }

  const handleBatchDelete = async () => {
    if (!selectedDeckId || selectedCardIds.length === 0) return
    if (!confirm(`确定要删除选中的 ${selectedCardIds.length} 张卡片吗？`)) return
    for (const cardId of selectedCardIds) {
      await deleteCard(selectedDeckId, cardId)
    }
    setSelectedCardIds([])
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)

    if (over && active.id !== over.id && selectedDeck) {
      const oldIndex = selectedDeck.cards.findIndex((c) => c.id === active.id)
      const newIndex = selectedDeck.cards.findIndex((c) => c.id === over.id)

      const newCards = arrayMove(selectedDeck.cards, oldIndex, newIndex)
      const cardIds = newCards.map((c) => c.id)

      reorderCards(selectedDeck.id, cardIds)
    }
  }

  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId]
    )
  }

  const toggleCardFlip = (cardId: string) => {
    setFlippedCardIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId]
    )
  }

  const goBack = () => {
    setSelectedDeckId(null)
    setSelectedCardIds([])
    setFlippedCardIds([])
  }

  if (loading && decks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  if (selectedDeck) {
    return (
      <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={goBack}
            className="p-2 hover:bg-gray-100 rounded-lg btn-press"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-primary flex-1">
            {selectedDeck.name}
          </h1>
          {selectedCardIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-lg btn-press text-sm font-medium"
            >
              批量删除 ({selectedCardIds.length})
            </button>
          )}
          <button
            onClick={() => setShowCardModal(true)}
            className="px-4 py-2 bg-accent text-white rounded-lg btn-press flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={18} />
            添加闪卡
          </button>
        </div>

        <p className="text-gray-500 text-sm mb-4">
          共 {selectedDeck.cards.length} 张卡片
        </p>

        {selectedDeck.cards.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-400 mb-4">暂无卡片，点击上方按钮添加</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedDeck.cards.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {selectedDeck.cards.map((card) => (
                <SortableItem
                  key={card.id}
                  card={card}
                  isSelected={selectedCardIds.includes(card.id)}
                  isFlipped={flippedCardIds.includes(card.id)}
                  onToggleSelect={() => toggleCardSelection(card.id)}
                  onDelete={() => handleDeleteCard(card.id)}
                  onFlip={() => toggleCardFlip(card.id)}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeDragId ? (
                <div className="bg-white rounded-xl shadow-xl p-4 flex items-center gap-3 border-2 border-accent/30 opacity-90">
                  <GripVertical size={20} className="text-accent" />
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {selectedDeck.cards.find((c) => c.id === activeDragId)?.question}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {showCardModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-primary">添加闪卡</h2>
                <button
                  onClick={() => setShowCardModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    问题
                  </label>
                  <textarea
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                    rows={3}
                    placeholder="输入问题..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    答案
                  </label>
                  <textarea
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                    rows={3}
                    placeholder="输入答案..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCardModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium btn-press"
                >
                  取消
                </button>
                <button
                  onClick={handleAddCard}
                  disabled={!newQuestion.trim() || !newAnswer.trim()}
                  className="flex-1 px-4 py-3 bg-accent text-white rounded-xl font-medium btn-press disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-6">闪卡管理</h1>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">我的闪卡组</h2>
        <button
          onClick={() => setShowDeckModal(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg btn-press flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={18} />
          新建卡组
        </button>
      </div>

      {decks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <p className="text-gray-400 mb-4">暂无卡组，点击上方按钮创建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="bg-white rounded-xl shadow-md card-hover p-5 cursor-pointer relative"
              onClick={() => setSelectedDeckId(deck.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteDeck(deck.id)
                }}
                className="absolute top-3 right-3 text-red-400 hover:text-red-600 p-1 btn-press"
              >
                <Trash2 size={18} />
              </button>

              <h3 className="font-bold text-lg text-primary mb-2 pr-8">
                {deck.name}
              </h3>
              <p className="text-gray-500 text-sm line-clamp-2 mb-3 min-h-[40px]">
                {deck.description || '暂无描述'}
              </p>
              <p className="text-sm text-gray-400">
                共 {deck.cards.length} 张卡片
              </p>
            </div>
          ))}
        </div>
      )}

      {showDeckModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-primary">新建卡组</h2>
              <button
                onClick={() => setShowDeckModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  卡组名称
                </label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="输入卡组名称..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  rows={3}
                  placeholder="输入卡组描述..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeckModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium btn-press"
              >
                取消
              </button>
              <button
                onClick={handleCreateDeck}
                disabled={!newDeckName.trim()}
                className="flex-1 px-4 py-3 bg-accent text-white rounded-xl font-medium btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
