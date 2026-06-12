import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, Difficulty, Ingredient, Step } from '../types';
import { api } from '../utils/api';
import { coverSchemes, difficultyMeta } from '../utils/theme';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Step = typeof import('../types').Step;

export default function RecipeEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== 'new';

  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [name, setName] = useState('');
  const [coverScheme, setCoverScheme] = useState(0);
  const [cookTime, setCookTime] = useState(30);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [emoji, setEmoji] = useState('🍳');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    api.getRecipe(id!).then((r) => {
      if (cancelled) return;
      setName(r.name);
      setCoverScheme(r.coverScheme);
      setCookTime(r.cookTime);
      setDifficulty(r.difficulty);
      setEmoji(r.emoji);
      setIngredients(r.ingredients);
      setSteps(r.steps);
      setTags(r.tags);
      setNotes(r.notes);
    });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setIngredients((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { id: uuidv4(), name: '', quantity: '' }]);
    setToast('已添加食材');
  };

  const updateIngredient = (ingId: string, patch: Partial<Ingredient>) => {
    setIngredients((prev) => prev.map((ing) => (ing.id === ingId ? { ...ing, ...patch } : ing)));
  };

  const removeIngredient = (ingId: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== ingId));
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { id: uuidv4(), description: '', emoji: STEP_EMOJIS[prev.length % STEP_EMOJIS.length] }]);
    setActiveStep(steps.length);
  };

  const updateStep = (stepId: string, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
  };

  const removeStep = (stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  const addTag = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags((prev) => [...prev, trimmed]);
    setTagInput('');
  };

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setToast('请填写食谱名称');
      return;
    }
    if (ingredients.length === 0) {
      setToast('请至少添加一种食材');
      return;
    }
    if (steps.length === 0) {
      setToast('请至少添加一个步骤');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        coverScheme,
        cookTime: Number(cookTime),
        difficulty,
        emoji,
        ingredients: ingredients.filter((i) => i.name.trim()),
        steps: steps.filter((s) => s.description.trim()),
        tags,
        notes,
      };
      const saved = isEdit ? await api.updateRecipe(id!, data) : await api.createRecipe(data);
      setToast('食谱已保存！');
      setTimeout(() => navigate(`/recipe/${saved.id}`), 800);
    } catch (e) {
      setToast('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const scheme = coverSchemes[coverScheme % coverSchemes.length];
  const diff = difficultyMeta[difficulty];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 80px' }}>
      {/* 顶部栏 */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24, flexWrap: 'wrap', gap: 12,
        }}
        className="fade-in"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to={isEdit ? `/recipe/${id}` : '/'}
            style={{
              width: 40, height: 40, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--card)', border: '1px solid var(--border)',
              color: 'var(--text-soft)', fontSize: 18,
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--card)'; }}
          >
            ←
          </Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{isEdit ? '编辑食谱' : '创建新食谱'}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>
              填写食谱信息，让美食灵感被记录下来
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={btnSecondary}
            onMouseEnter={(e) => hoverSecondary(e, true)}
            onMouseLeave={(e) => hoverSecondary(e, false)}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...btnPrimary,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? '保存中...' : '✓ 保存食谱'}
          </button>
        </div>
      </div>

      {/* 预览卡片 */}
      <div
        style={{
          display: 'flex', gap: 20,
          background: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
          boxShadow: 'var(--shadow-md)',
          marginBottom: 24,
          border: '1px solid var(--border)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
        className="fade-in"
      >
        <div
          style={{
            width: 120, height: 120, borderRadius: 'var(--radius-md)',
            background: scheme.grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 52, position: 'relative', overflow: 'hidden', flexShrink: 0,
            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', top: -20, right: -20 }} />
          <span style={{ position: 'relative', zIndex: 1 }}>{emoji}</span>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, minHeight: 28 }}>
            {name || <span style={{ color: '#c9b89e' }}>食谱名称</span>}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: 'var(--text-soft)', fontSize: 13.5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="hourglass">⏳</span>{cookTime} 分钟
            </span>
            <span
              style={{
                padding: '2px 10px', borderRadius: 999,
                background: diff.bg, color: diff.color,
                border: `1px solid ${diff.border}`, fontWeight: 500, fontSize: 12.5,
              }}
            >
              {diff.label}
            </span>
            <span>🥗 {ingredients.length} 种食材</span>
            <span>📝 {steps.length} 个步骤</span>
          </div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {tags.map((t) => (
                <span key={t} style={{
                  fontSize: 11.5, padding: '3px 10px', borderRadius: 999,
                  background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 500,
                }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 步骤导航 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }} className="fade-in">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveStep(i)}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              fontSize: 14,
              fontWeight: activeStep === i ? 600 : 500,
              background: activeStep === i ? 'var(--primary)' : 'var(--card)',
              color: activeStep === i ? '#fff' : 'var(--text-soft)',
              boxShadow: activeStep === i ? '0 4px 12px rgba(181, 85, 62, 0.25)' : 'var(--shadow-sm)',
              border: `1px solid ${activeStep === i ? 'var(--primary)' : 'var(--border)'}`,
              transition: 'all 0.25s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div key={activeStep} style={{ animation: 'slideRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        {/* 1. 基本信息 */}
        {activeStep === 0 && (
          <Section title="📋 基本信息" desc="设置食谱的基础元信息">
            <Field label="食谱名称">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：番茄炒蛋"
                style={inputStyle}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="🍳 代表图标">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: emoji === e ? 'var(--primary-light)' : 'var(--bg)',
                        border: `2px solid ${emoji === e ? 'var(--primary)' : 'var(--border)'}`,
                        fontSize: 22,
                        transition: 'all 0.2s',
                        transform: emoji === e ? 'scale(1.08)' : 'scale(1)',
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="⏱️ 烹饪时间（分钟）">
                <input
                  type="number" min="1" value={cookTime}
                  onChange={(e) => setCookTime(Number(e.target.value))}
                  style={inputStyle}
                />
              </Field>
            </div>
            <Field label="🎚️ 难度等级">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(['easy', 'medium', 'hard'] as const).map((d) => {
                  const m = difficultyMeta[d];
                  const active = difficulty === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-md)',
                        background: active ? m.bg : 'var(--bg)',
                        color: active ? m.color : 'var(--text-soft)',
                        border: `2px solid ${active ? m.border : 'var(--border)'}`,
                        fontWeight: active ? 600 : 500,
                        fontSize: 14,
                        transition: 'all 0.2s',
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="🎨 封面配色方案">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {coverSchemes.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setCoverScheme(i)}
                    style={{
                      borderRadius: 14,
                      padding: 4,
                      background: coverScheme === i ? 'var(--primary)' : 'transparent',
                      transition: 'all 0.25s',
                      transform: coverScheme === i ? 'scale(1.04)' : 'scale(1)',
                    }}
                  >
                    <div
                      style={{
                        height: 56,
                        borderRadius: 10,
                        background: s.grad,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {coverScheme === i && (
                        <div
                          style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.15)', color: '#fff',
                            fontSize: 18, fontWeight: 700,
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: coverScheme === i ? '#fff' : 'var(--text-soft)', marginTop: 6, textAlign: 'center', fontWeight: 500 }}>
                      {s.name}
                    </div>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="🏷️ 标签（季节/场合等）">
              <div
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: 6,
                  padding: 10,
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg)',
                  minHeight: 44,
                  alignItems: 'center',
                }}
              >
                {tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 500,
                    }}
                  >
                    #{t}
                    <button
                      onClick={() => removeTag(t)}
                      style={{ fontSize: 11, color: 'var(--primary)', width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); }
                  }}
                  placeholder="输入标签后按回车添加..."
                  style={{
                    flex: 1, minWidth: 120,
                    border: 'none', outline: 'none',
                    background: 'transparent', fontSize: 13,
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>快捷：</span>
                {['春季', '夏季', '秋季', '冬季', '家常', '宴客', '快手', '健康', '甜品', '硬菜', '节日', '下饭菜'].map((t) => (
                  <button
                    key={t}
                    onClick={() => addTag(t)}
                    disabled={tags.includes(t)}
                    style={{
                      padding: '3px 10px',
                      fontSize: 11.5,
                      borderRadius: 999,
                      background: tags.includes(t) ? 'var(--bg-soft)' : 'var(--bg)',
                      color: tags.includes(t) ? 'var(--text-soft)' : 'var(--accent)',
                      border: `1px solid ${tags.includes(t) ? 'var(--border)' : '#CFDCC0'}`,
                      cursor: tags.includes(t) ? 'not-allowed' : 'pointer',
                      opacity: tags.includes(t) ? 0.5 : 1,
                    }}
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </Field>
          </Section>
        )}

        {/* 2. 食材列表 */}
        {activeStep === 1 && (
          <Section title="🥗 食材列表" desc="添加烹饪这道菜需要的所有食材，可拖拽排序">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={ingredients.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ingredients.map((ing, i) => (
                    <SortableIngredientItem
                      key={ing.id}
                      ingredient={ing}
                      index={i}
                      onUpdate={(patch) => updateIngredient(ing.id, patch)}
                      onRemove={() => removeIngredient(ing.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {ingredients.length === 0 && (
              <div
                style={{
                  padding: '40px 20px', textAlign: 'center',
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-soft)',
                  fontSize: 14,
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>🥗</div>
                还没有食材，点击下方按钮添加
              </div>
            )}
            <button
              onClick={addIngredient}
              style={{
                width: '100%', padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '2px dashed var(--border)',
                background: 'transparent',
                color: 'var(--text-soft)',
                fontSize: 14, fontWeight: 500,
                transition: 'all 0.2s',
                marginTop: 12,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                (e.currentTarget as HTMLElement).style.color = 'var(--primary)';
                (e.currentTarget as HTMLElement).style.background = 'var(--primary-light)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-soft)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              + 添加食材
            </button>
          </Section>
        )}

        {/* 3. 步骤说明 */}
        {activeStep === 2 && (
          <Section title="👨‍🍳 步骤说明" desc="分步描述制作过程，每步可配一个emoji图标">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex', gap: 14,
                    padding: '16px',
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    animation: `fadeInUp 0.3s ${i * 0.04}s both`,
                  }}
                >
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: 'linear-gradient(135deg, var(--primary), #E8A87C)',
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(181, 85, 62, 0.25)',
                    }}
                  >
                    {step.emoji || i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-soft)', alignSelf: 'center' }}>图标：</span>
                      {STEP_EMOJIS.slice(0, 12).map((e) => (
                        <button
                          key={e}
                          onClick={() => updateStep(step.id, { emoji: e })}
                          style={{
                            width: 30, height: 30, borderRadius: 8,
                            background: step.emoji === e ? 'var(--primary-light)' : 'transparent',
                            border: `1px solid ${step.emoji === e ? 'var(--primary)' : 'transparent'}`,
                            fontSize: 16,
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={step.description}
                      onChange={(e) => updateStep(step.id, { description: e.target.value })}
                      placeholder={`第 ${i + 1} 步...`}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: '#fff',
                        fontSize: 14,
                        outline: 'none',
                        resize: 'vertical',
                        lineHeight: 1.6,
                        transition: 'all 0.2s',
                      }}
                      onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--primary)'; }}
                      onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border)'; }}
                    />
                  </div>
                  <button
                    onClick={() => removeStep(step.id)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      color: 'var(--text-soft)', fontSize: 14,
                      alignSelf: 'flex-start', flexShrink: 0,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(163, 72, 72, 0.1)';
                      (e.currentTarget as HTMLElement).style.color = '#A34848';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-soft)';
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            {steps.length === 0 && (
              <div
                style={{
                  padding: '40px 20px', textAlign: 'center',
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-soft)',
                  fontSize: 14,
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
                还没有步骤，点击下方按钮添加第一步
              </div>
            )}
            <button
              onClick={addStep}
              style={{
                width: '100%', padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '2px dashed var(--border)',
                background: 'transparent',
                color: 'var(--text-soft)',
                fontSize: 14, fontWeight: 500,
                transition: 'all 0.2s',
                marginTop: 12,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                (e.currentTarget as HTMLElement).style.color = 'var(--primary)';
                (e.currentTarget as HTMLElement).style.background = 'var(--primary-light)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-soft)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              + 添加步骤
            </button>
          </Section>
        )}

        {/* 底部操作栏 */}
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', gap: 12,
            marginTop: 28, flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
            disabled={activeStep === 0}
            style={{
              ...btnSecondary,
              opacity: activeStep === 0 ? 0.5 : 1,
              cursor: activeStep === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← 上一步
          </button>
          {activeStep < SECTIONS.length - 1 ? (
            <button
              onClick={() => setActiveStep((s) => Math.min(SECTIONS.length - 1, s + 1))}
              style={btnPrimary}
            >
              下一步 →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} style={{
              ...btnPrimary,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? '保存中...' : '✓ 保存食谱'}
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 32, left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 22px',
            background: 'rgba(60, 46, 37, 0.94)',
            color: '#fff',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            zIndex: 1000,
            animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

const SECTIONS = [
  { id: 'basic', icon: '📋', label: '基本信息' },
  { id: 'ingredients', icon: '🥗', label: '食材' },
  { id: 'steps', icon: '👨‍🍳', label: '步骤' },
];

const EMOJI_OPTIONS = ['🍳', '🍕', '🍜', '🍝', '🥘', '🍲', '🥗', '🍰', '🍪', '🥧', '🍱', '🥡', '🌮', '🍔', '🥙', '🍛'];

const STEP_EMOJIS = ['🔪', '🔥', '🥄', '🍳', '💧', '♨️', '🧄', '🌶️', '🥓', '🥬', '🍬', '⏰', '✨', '🎉'];

interface SortableIngredientItemProps {
  ingredient: Ingredient;
  index: number;
  onUpdate: (patch: Partial<Ingredient>) => void;
  onRemove: () => void;
}

function SortableIngredientItem({ ingredient, index, onUpdate, onRemove }: SortableIngredientItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ingredient.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        background: isDragging ? 'var(--primary-light)' : 'var(--bg)',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
        boxShadow: isDragging ? 'var(--shadow-lg)' : 'none',
        ...style,
      }}
    >
      <button
        {...attributes}
        {...listeners}
        style={{
          width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-soft)',
          cursor: 'grab',
          fontSize: 16,
          borderRadius: 6,
          touchAction: 'none',
        }}
        onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.cursor = 'grabbing'; }}
        onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.cursor = 'grab'; }}
      >
        ⋮⋮
      </button>
      <span
        style={{
          width: 24, height: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600,
          color: 'var(--text-soft)',
          background: 'rgba(0,0,0,0.04)',
          borderRadius: 6,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </span>
      <input
        value={ingredient.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="食材名称"
        style={{
          flex: 1,
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: '#fff',
          fontSize: 14,
          outline: 'none',
          transition: 'all 0.2s',
        }}
        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--primary)'; }}
        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
      />
      <input
        value={ingredient.quantity}
        onChange={(e) => onUpdate({ quantity: e.target.value })}
        placeholder="用量"
        style={{
          width: 100,
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: '#fff',
          fontSize: 14,
          outline: 'none',
          transition: 'all 0.2s',
          textAlign: 'center',
        }}
        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--primary)'; }}
        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
      />
      <button
        onClick={onRemove}
        style={{
          width: 28, height: 28, borderRadius: 6,
          color: 'var(--text-soft)', fontSize: 14,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(163, 72, 72, 0.1)';
          (e.currentTarget as HTMLElement).style.color = '#A34848';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-soft)';
        }}
      >
        ✕
      </button>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{title}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>{desc}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: '#fff',
  fontSize: 14,
  outline: 'none',
  transition: 'all 0.2s',
};

const btnPrimary: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--primary)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 14,
  boxShadow: '0 4px 12px rgba(181, 85, 62, 0.25)',
  transition: 'all 0.2s',
};

const btnSecondary: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--card)',
  color: 'var(--text-soft)',
  fontWeight: 500,
  fontSize: 14,
  border: '1px solid var(--border)',
  transition: 'all 0.2s',
};

function hoverSecondary(e: React.MouseEvent<HTMLElement>, on: boolean) {
  const el = e.currentTarget;
  if (on) {
    el.style.background = 'var(--bg-soft)';
    el.style.color = 'var(--text)';
  } else {
    el.style.background = 'var(--card)';
    el.style.color = 'var(--text-soft)';
  }
}
