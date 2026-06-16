import React, { useState, useEffect } from 'react'
import type { Recipe, Ingredient, SubstitutionResult, Difficulty } from './types'
import { getSubstitutionResults, applySubstitution, formatTasteChange } from './substitutionEngine'

interface RecipeDetailProps {
  recipe: Recipe
  onBack: () => void
  onUpdateRecipe: (recipe: Recipe) => void
}

const difficultyLabels: Record<Difficulty, string> = {
  simple: '简单',
  medium: '中等',
  hard: '困难'
}

const difficultyColors: Record<Difficulty, string> = {
  simple: '#81C784',
  medium: '#FFB74D',
  hard: '#E57373'
}

const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onBack, onUpdateRecipe }) => {
  const [notes, setNotes] = useState(recipe.notes)
  const [showModal, setShowModal] = useState(false)
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null)
  const [highlightedIngredientId, setHighlightedIngredientId] = useState<string | null>(null)
  const [substitutionResults, setSubstitutionResults] = useState<SubstitutionResult[]>([])

  useEffect(() => {
    setNotes(recipe.notes)
  }, [recipe.id, recipe.notes])

  useEffect(() => {
    if (notes !== recipe.notes) {
      const timer = setTimeout(() => {
        onUpdateRecipe({ ...recipe, notes })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [notes])

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, 500)
    setNotes(value)
  }

  const handleOpenModal = () => {
    setShowModal(true)
    setSelectedIngredientId(null)
    setSubstitutionResults([])
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedIngredientId(null)
    setSubstitutionResults([])
  }

  const handleSelectIngredient = (ingredient: Ingredient) => {
    setSelectedIngredientId(ingredient.id)
    const results = getSubstitutionResults(ingredient)
    setSubstitutionResults(results)
  }

  const handleApplySubstitution = (result: SubstitutionResult) => {
    const ingredient = recipe.ingredients.find((i) => i.id === selectedIngredientId)
    if (!ingredient) return

    const newIngredients = recipe.ingredients.map((i) =>
      i.id === selectedIngredientId ? applySubstitution(i, result) : i
    )

    const updatedRecipe = { ...recipe, ingredients: newIngredients }
    onUpdateRecipe(updatedRecipe)

    setHighlightedIngredientId(selectedIngredientId)
    handleCloseModal()

    setTimeout(() => {
      setHighlightedIngredientId(null)
    }, 2000)
  }

  const selectedIngredient = recipe.ingredients.find((i) => i.id === selectedIngredientId)

  return (
    <div style={styles.container}>
      <button className="fullwidth-btn" style={styles.backButton} onClick={onBack}>
        ← 返回食谱列表
      </button>

      <div style={styles.recipeHeader}>
        <div style={styles.recipeTitleRow}>
          <h1 style={styles.recipeName}>{recipe.name}</h1>
          <div style={styles.recipeMeta}>
            <span style={styles.metaItem}>⏱ {recipe.cookTime}分钟</span>
            <span
              style={{
                ...styles.difficultyBadge,
                backgroundColor: difficultyColors[recipe.difficulty]
              }}
            >
              {difficultyLabels[recipe.difficulty]}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🥬 食材清单</h2>
        <div style={styles.ingredientList}>
          {recipe.ingredients.map((ingredient, index) => (
            <div
              key={ingredient.id}
              className="ingredient-row"
              style={{
                ...styles.ingredientRow,
                backgroundColor:
                  highlightedIngredientId === ingredient.id ? '#FFF9C4' : 'transparent',
                animation: `fadeInUp 0.4s ease-out ${index * 80}ms both`,
                transition: 'background-color 0.3s ease'
              }}
            >
              <span style={styles.ingredientName}>
                {ingredient.isReplaced && (
                  <span style={styles.replacedTag}>已替换</span>
                )}
                {ingredient.name}
                {ingredient.originalName && ingredient.originalName !== ingredient.name && (
                  <span style={styles.originalName}>（原：{ingredient.originalName}）</span>
                )}
              </span>
              <span style={styles.ingredientAmount}>
                {ingredient.amount} {ingredient.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>👨‍🍳 烹饪步骤</h2>
        <div style={styles.stepsList}>
          {recipe.steps.map((step, index) => (
            <div
              key={step.id}
              className="step-item"
              style={{
                ...styles.stepItem,
                animation: `fadeInUp 0.4s ease-out ${index * 80}ms both`
              }}
            >
              <div style={styles.stepNumber}>{index + 1}</div>
              <div style={styles.stepContent}>{step.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📝 我的笔记</h2>
        <div style={styles.notesContainer}>
          <textarea
            style={styles.notesTextarea}
            value={notes}
            onChange={handleNotesChange}
            placeholder="记录你的烹饪心得、调整建议..."
            maxLength={500}
          />
          <div style={styles.charCount}>{notes.length}/500</div>
        </div>
      </div>

      <div style={styles.actionSection}>
        <button
          className="fullwidth-btn"
          style={styles.substitutionButton}
          onClick={handleOpenModal}
        >
          🔄 智能替换
        </button>
      </div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            className="modal-anim"
          >
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>智能食材替换</h3>
              <button style={styles.modalClose} onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.ingredientSelectSection}>
                <h4 style={styles.subSectionTitle}>选择要替换的食材</h4>
                <div style={styles.ingredientSelectList}>
                  {recipe.ingredients.map((ingredient) => (
                    <button
                      key={ingredient.id}
                      style={{
                        ...styles.ingredientSelectItem,
                        backgroundColor:
                          selectedIngredientId === ingredient.id
                            ? '#FFE0B2'
                            : '#FFF3E0',
                        borderColor:
                          selectedIngredientId === ingredient.id
                            ? '#FF7043'
                            : 'transparent'
                      }}
                      onClick={() => handleSelectIngredient(ingredient)}
                    >
                      {ingredient.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedIngredient && substitutionResults.length > 0 && (
                <div style={styles.substitutionSection}>
                  <h4 style={styles.subSectionTitle}>
                    「{selectedIngredient.name}」的替换方案
                  </h4>
                  <div style={styles.substitutionList}>
                    {substitutionResults.map((result, idx) => (
                      <div
                        key={result.rule.id}
                        className="substitution-item"
                        style={{
                          ...styles.substitutionItem,
                          animation: `fadeInUp 0.4s ease-out ${idx * 80}ms both`
                        }}
                      >
                        <div style={styles.substitutionInfo}>
                          <div style={styles.substituteName}>
                            {result.rule.substituteName}
                          </div>
                          <div style={styles.substitutionRatio}>
                            替换比例：{result.rule.ratio} → 需用{' '}
                            <strong>{result.convertedAmount}</strong>{' '}
                            {result.unit}
                          </div>
                          <div style={styles.tasteDescription}>
                            {result.rule.tasteDescription}
                          </div>
                          <div style={styles.tasteTags}>
                            {formatTasteChange(result.rule.tasteChange)}
                          </div>
                        </div>
                        <button
                          className="fullwidth-btn"
                          style={styles.applyButton}
                          onClick={() => handleApplySubstitution(result)}
                        >
                          替换
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedIngredient && substitutionResults.length === 0 && (
                <div style={styles.noResults}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤔</div>
                <p style={{ color: '#8D6E63', margin: 0 }}>
                  暂无「{selectedIngredient.name}」的替换方案
                </p>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
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
        @keyframes modalScaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .modal-anim {
          animation: modalScaleIn 0.3s ease-out both;
        }
        @media (max-width: 480px) {
          .fullwidth-btn {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#FF7043',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '8px 16px',
    marginBottom: '16px',
    borderRadius: '8px',
    fontWeight: 500
  },
  recipeHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  recipeTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px'
  },
  recipeName: {
    fontSize: '28px',
    color: '#4E342E',
    margin: 0,
    fontWeight: 700
  },
  recipeMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  metaItem: {
    fontSize: '14px',
    color: '#8D6E63'
  },
  difficultyBadge: {
    padding: '6px 16px',
    borderRadius: '12px',
    fontSize: '13px',
    color: '#FFFFFF',
    fontWeight: 500
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '20px 24px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  sectionTitle: {
    fontSize: '20px',
    color: '#4E342E',
    margin: '0 0 16px 0',
    fontWeight: 600
  },
  ingredientList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  ingredientRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    borderBottom: '1px solid #FFF8F0'
  },
  ingredientName: {
    fontSize: '15px',
    color: '#4E342E',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  replacedTag: {
    backgroundColor: '#FFB74D',
    color: '#FFFFFF',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 500
  },
  originalName: {
    fontSize: '12px',
    color: '#8D6E63',
    fontStyle: 'italic'
  },
  ingredientAmount: {
    fontSize: '15px',
    color: '#FF7043',
    fontWeight: 600
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  stepItem: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    backgroundColor: '#FF7043',
    color: '#FFFFFF',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '14px',
    flexShrink: 0
  },
  stepContent: {
    fontSize: '15px',
    color: '#4E342E',
    lineHeight: 1.6,
    paddingTop: '4px',
    flex: 1
  },
  notesContainer: {
    position: 'relative'
  },
  notesTextarea: {
    width: '100%',
    minHeight: '120px',
    padding: '12px 16px',
    border: '1px solid #FFE0B2',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#4E342E',
    backgroundColor: '#FFFBF5',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.6,
    boxSizing: 'border-box'
  },
  charCount: {
    position: 'absolute',
    right: '12px',
    bottom: '8px',
    fontSize: '12px',
    color: '#8D6E63'
  },
  actionSection: {
    marginTop: '8px'
  },
  substitutionButton: {
    backgroundColor: '#FF7043',
    color: '#FFFFFF',
    border: 'none',
    padding: '14px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(255, 112, 67, 0.3)',
    transition: 'all 0.2s ease'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px'
  },
  modalContent: {
    backgroundColor: '#FFF8F0',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #FFE0B2',
    backgroundColor: '#FFFFFF'
  },
  modalTitle: {
    fontSize: '20px',
    color: '#4E342E',
    margin: 0,
    fontWeight: 600
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#8D6E63',
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
    width: '32px',
    height: '32px'
  },
  modalBody: {
    padding: '20px 24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'flex',
    gap: '20px'
  },
  ingredientSelectSection: {
    flex: 1
  },
  subSectionTitle: {
    fontSize: '16px',
    color: '#4E342E',
    margin: '0 0 12px 0',
    fontWeight: 600
  },
  ingredientSelectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  ingredientSelectItem: {
    padding: '10px 16px',
    border: '2px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4E342E',
    textAlign: 'left',
    transition: 'all 0.2s ease'
  },
  substitutionSection: {
    flex: 1
  },
  substitutionList: {
    display: 'flex',
    flexDirection: 'flex',
    gap: '12px'
  },
  substitutionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
  },
  substitutionInfo: {
    flex: 1
  },
  substituteName: {
    fontSize: '16px',
    color: '#4E342E',
    fontWeight: 600,
    marginBottom: '6px'
  },
  substitutionRatio: {
    fontSize: '13px',
    color: '#8D6E63',
    marginBottom: '6px'
  },
  tasteDescription: {
    fontSize: '13px',
    color: '#FF7043',
    marginBottom: '6px'
  },
  tasteTags: {
    fontSize: '12px',
    color: '#8D6E63',
    backgroundColor: '#FFF3E0',
    padding: '4px 10px',
    borderRadius: '10px',
    display: 'inline-block'
  },
  applyButton: {
    backgroundColor: '#FFB74D',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  noResults: {
    flex: 1,
    textAlign: 'center',
    padding: '30px 20px'
  }
}

export default RecipeDetail
