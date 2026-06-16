import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRecipeStore } from '../store/recipeStore'
import ShareCard from '../components/ShareCard'

export default function RecipeEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const shareCardRef = useRef<any>(null)

  const {
    currentRecipe,
    ingredients,
    editingRowId,
    loadRecipe,
    loadRecipes,
    setIngredients,
    setEditingRowId,
    addIngredient,
    removeIngredient,
    updateIngredient,
    updateRecipeInfo,
    calculateTotalCost,
    calculateUnitCost,
    calculateGrossMargin,
    getStockByName,
    saveRecipe,
    createNewRecipe
  } = useRecipeStore()

  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [showShareModal, setShowShareModal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/ingredients')
      .then(res => res.json())
      .then(data => setIngredients(data))
  }, [setIngredients])

  useEffect(() => {
    if (id && id !== 'new') {
      loadRecipe(id)
    } else {
      createNewRecipe()
    }
  }, [id, loadRecipe, createNewRecipe])

  const handleRemove = (ingId: string) => {
    setRemovingIds(prev => new Set(prev).add(ingId))
    setTimeout(() => {
      removeIngredient(ingId)
      setRemovingIds(prev => {
        const next = new Set(prev)
        next.delete(ingId)
        return next
      })
    }, 300)
  }

  const handleIngredientNameChange = (ingId: string, name: string) => {
    const stock = getStockByName(name)
    updateIngredient(ingId, {
      name,
      pricePerGram: stock?.defaultPrice || 0.01
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const saved = await saveRecipe()
    setSaving(false)
    if (saved) {
      alert('保存成功！')
      if (id === 'new') {
        navigate(`/recipes/${saved.id}`)
      }
    }
  }

  const handleDownload = async () => {
    if (shareCardRef.current) {
      const dataUrl = await shareCardRef.current.toPng()
      const link = document.createElement('a')
      link.download = `${currentRecipe?.name || '配方'}.png`
      link.href = dataUrl
      link.click()
    }
  }

  if (!currentRecipe) {
    return <div style={loadingStyle}>加载中...</div>
  }

  const totalCost = calculateTotalCost()
  const unitCost = calculateUnitCost()
  const grossMargin = calculateGrossMargin()

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={pageTitleStyle}>
          {id === 'new' ? '创建新配方' : '编辑配方'}
        </h2>
        <div style={headerActionsStyle}>
          <button style={secondaryBtnStyle} onClick={() => setShowShareModal(true)}>
            📤 生成分享卡片
          </button>
          <button style={primaryBtnStyle} onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '💾 保存配方'}
          </button>
        </div>
      </div>

      <div style={costCardsContainer}>
        <div style={{ ...costCardStyle, backgroundColor: '#FFF3E0' }}>
          <div style={costLabelStyle}>食材总成本</div>
          <div style={costValueStyle}>¥ {totalCost.toFixed(2)}</div>
        </div>
        <div style={{ ...costCardStyle, backgroundColor: '#FFE0B2' }}>
          <div style={costLabelStyle}>单个成品成本</div>
          <div style={costValueStyle}>¥ {unitCost.toFixed(2)}</div>
        </div>
        <div style={{ ...costCardStyle, backgroundColor: '#FFCC80' }}>
          <div style={costLabelStyle}>估算毛利率</div>
          <div style={costValueStyle}>{grossMargin.toFixed(1)}%</div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>基本信息</h3>
        <div style={formRowStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>配方名称</label>
            <input
              type="text"
              value={currentRecipe.name}
              onChange={(e) => updateRecipeInfo({ name: e.target.value })}
              style={inputStyle}
              placeholder="例如：经典巧克力曲奇"
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>成品数量</label>
            <div style={inputGroupStyle}>
              <input
                type="number"
                value={currentRecipe.yieldQuantity}
                onChange={(e) => updateRecipeInfo({ yieldQuantity: Number(e.target.value) })}
                style={{ ...inputStyle, flex: 1 }}
                min="1"
              />
              <input
                type="text"
                value={currentRecipe.yieldUnit}
                onChange={(e) => updateRecipeInfo({ yieldUnit: e.target.value })}
                style={{ ...inputStyle, width: '80px' }}
                placeholder="个"
              />
            </div>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>制作耗时（分钟）</label>
            <input
              type="number"
              value={currentRecipe.prepTime}
              onChange={(e) => updateRecipeInfo({ prepTime: Number(e.target.value) })}
              style={inputStyle}
              min="1"
            />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={sectionTitleStyle}>食材清单</h3>
          <button style={addBtnStyle} onClick={() => addIngredient()}>
            ➕ 添加食材
          </button>
        </div>

        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={tableHeaderCellStyle}>食材名称</th>
                <th style={tableHeaderCellStyle}>用量</th>
                <th style={tableHeaderCellStyle}>单位</th>
                <th style={tableHeaderCellStyle}>单价（元/克）</th>
                <th style={tableHeaderCellStyle}>小计（元）</th>
                <th style={tableHeaderCellStyle}>库存状态</th>
                <th style={tableHeaderCellStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {currentRecipe.ingredients.map((ing) => {
                const stock = getStockByName(ing.name)
                const remainingStock = stock ? stock.stock - ing.amount : 0
                const isLow = stock ? (stock.stock - ing.amount) / stock.stock < 0.2 : false
                const subtotal = ing.amount * ing.pricePerGram
                const isEditing = editingRowId === ing.id
                const isRemoving = removingIds.has(ing.id)

                return (
                  <tr
                    key={ing.id}
                    style={{
                      ...tableRowStyle,
                      backgroundColor: isEditing ? '#E3F2FD' : undefined,
                      opacity: isRemoving ? 0 : 1,
                      transform: isRemoving ? 'translateY(-10px)' : 'translateY(0)',
                      transition: 'all 0.3s ease-out'
                    }}
                    onMouseEnter={(e) => {
                      if (!isEditing) {
                        e.currentTarget.style.backgroundColor = '#F5F5F5'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isEditing) {
                        e.currentTarget.style.backgroundColor = 'white'
                      }
                    }}
                    onClick={() => setEditingRowId(ing.id)}
                    className={isRemoving ? 'row-exit' : 'row-enter'}
                  >
                    <td style={tableCellStyle}>
                      <select
                        value={ing.name}
                        onChange={(e) => handleIngredientNameChange(ing.id, e.target.value)}
                        style={selectStyle}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ingredients.map(stockIng => (
                          <option key={stockIng.id} value={stockIng.name}>
                            {stockIng.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={tableCellStyle}>
                      <input
                        type="number"
                        value={ing.amount}
                        onChange={(e) => updateIngredient(ing.id, { amount: Number(e.target.value) })}
                        style={numberInputStyle}
                        onClick={(e) => e.stopPropagation()}
                        min="0"
                        step="1"
                      />
                    </td>
                    <td style={tableCellStyle}>
                      <input
                        type="text"
                        value={ing.unit}
                        onChange={(e) => updateIngredient(ing.id, { unit: e.target.value })}
                        style={{ ...textInputStyle, width: '60px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td style={tableCellStyle}>
                      <input
                        type="number"
                        value={ing.pricePerGram}
                        onChange={(e) => updateIngredient(ing.id, { pricePerGram: Number(e.target.value) })}
                        style={numberInputStyle}
                        onClick={(e) => e.stopPropagation()}
                        step="0.001"
                        min="0"
                      />
                    </td>
                    <td style={{ ...tableCellStyle, fontWeight: 600, color: '#795548' }}>
                      ¥ {subtotal.toFixed(2)}
                    </td>
                    <td style={tableCellStyle}>
                      {stock ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', color: isLow ? '#FF5252' : '#666' }}>
                            剩余 {remainingStock.toFixed(0)}{stock.unit}
                          </span>
                          {isLow && (
                            <span className="warning-blink" style={{ color: '#FF5252', fontSize: '16px' }}>
                              ⚠️
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#999' }}>暂无库存数据</span>
                      )}
                    </td>
                    <td style={tableCellStyle}>
                      <button
                        style={deleteBtnStyle}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(ing.id)
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={tableFooterRowStyle}>
                <td colSpan={4} style={{ ...tableFooterCellStyle, textAlign: 'right', fontWeight: 600 }}>
                  食材总成本：
                </td>
                <td style={{ ...tableFooterCellStyle, fontWeight: 700, color: '#795548', fontSize: '16px' }}>
                  ¥ {totalCost.toFixed(2)}
                </td>
                <td colSpan={2} style={tableFooterCellStyle}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>制作步骤</h3>
        <textarea
          value={currentRecipe.steps}
          onChange={(e) => updateRecipeInfo({ steps: e.target.value })}
          style={textareaStyle}
          placeholder="请输入制作步骤..."
          rows={6}
        />
      </div>

      {showShareModal && (
        <div style={modalOverlayStyle} onClick={() => setShowShareModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>分享卡片预览</h3>
              <button style={closeBtnStyle} onClick={() => setShowShareModal(false)}>
                ✕
              </button>
            </div>
            <div style={modalBodyStyle}>
              <ShareCard ref={shareCardRef} recipe={currentRecipe} />
            </div>
            <div style={modalFooterStyle}>
              <button
                style={downloadBtnStyle}
                onClick={handleDownload}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                📥 下载为 PNG 图片
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '50vh',
  fontSize: '18px',
  color: '#666'
}

const containerStyle: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto'
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px'
}

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '28px',
  color: '#5D4037',
  fontWeight: 700
}

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px'
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#795548',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'background-color 0.2s'
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: 'white',
  color: '#795548',
  border: '2px solid #795548',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.2s'
}

const costCardsContainer: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginBottom: '28px'
}

const costCardStyle: React.CSSProperties = {
  flex: 1,
  padding: '20px',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
}

const costLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6D4C41',
  marginBottom: '8px',
  fontWeight: 500
}

const costValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#4E342E'
}

const sectionStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px'
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '18px',
  color: '#5D4037',
  fontWeight: 600
}

const addBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#A1887F',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500
}

const formRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '20px'
}

const formGroupStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
}

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6D4C41',
  fontWeight: 500
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid #D7CCC8',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s'
}

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px'
}

const tableContainerStyle: React.CSSProperties = {
  overflowX: 'auto'
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0
}

const tableHeaderRowStyle: React.CSSProperties = {
  backgroundColor: '#EFEBE9'
}

const tableHeaderCellStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '13px',
  fontWeight: 600,
  color: '#5D4037',
  borderBottom: '2px solid #D7CCC8'
}

const tableRowStyle: React.CSSProperties = {
  cursor: 'pointer',
  transition: 'all 0.2s'
}

const tableCellStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #EFEBE9',
  fontSize: '14px'
}

const tableFooterRowStyle: React.CSSProperties = {
  backgroundColor: '#FFF8E1'
}

const tableFooterCellStyle: React.CSSProperties = {
  padding: '16px',
  fontSize: '14px',
  borderBottom: 'none'
}

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #D7CCC8',
  borderRadius: '6px',
  fontSize: '14px',
  backgroundColor: 'white',
  cursor: 'pointer',
  outline: 'none',
  minWidth: '120px'
}

const numberInputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #D7CCC8',
  borderRadius: '6px',
  fontSize: '14px',
  width: '80px',
  textAlign: 'right',
  outline: 'none'
}

const textInputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #D7CCC8',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none'
}

const deleteBtnStyle: React.CSSProperties = {
  padding: '6px 10px',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px',
  borderRadius: '4px',
  transition: 'background-color 0.2s'
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  border: '1px solid #D7CCC8',
  borderRadius: '8px',
  fontSize: '14px',
  lineHeight: 1.6,
  resize: 'vertical',
  outline: 'none',
  fontFamily: 'inherit'
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
}

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '16px',
  width: '500px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}

const modalHeaderStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid #EFEBE9',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const modalTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '18px',
  color: '#5D4037',
  fontWeight: 600
}

const closeBtnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  fontSize: '20px',
  cursor: 'pointer',
  color: '#999',
  padding: '4px 8px'
}

const modalBodyStyle: React.CSSProperties = {
  padding: '24px',
  display: 'flex',
  justifyContent: 'center',
  overflowY: 'auto'
}

const modalFooterStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid #EFEBE9',
  display: 'flex',
  justifyContent: 'center'
}

const downloadBtnStyle: React.CSSProperties = {
  padding: '12px 32px',
  backgroundColor: '#795548',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: 500,
  transition: 'transform 0.2s ease'
}
