import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useAppContext } from './App';
import type { Question, Courseware, QuestionType } from './types';

const createEmptyQuestion = (type: QuestionType): Question => ({
  id: uuidv4(),
  type,
  prompt: type === 'quiz' ? '新测验题' : '新投票题',
  options: type === 'quiz' ? ['选项A', '选项B'] : ['选项A', '选项B'],
  correctAnswer: type === 'quiz' ? 0 : undefined
});

function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { coursewares, setCoursewares } = useAppContext();
  
  const [courseware, setCourseware] = useState<Courseware>({
    id: '',
    title: '未命名课件',
    content: '',
    questions: []
  });
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      const found = coursewares.find(c => c.id === id);
      if (found) {
        setCourseware(found);
      }
    }
  }, [id, coursewares]);

  const selectedQuestion = courseware.questions.find(q => q.id === selectedQuestionId) || null;

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    
    const { source, destination, type } = result;

    if (!destination) return;

    if (type === 'sidebar') {
      const questionType = source.droppableId as QuestionType;
      const newQuestion = createEmptyQuestion(questionType);
      
      const newQuestions = [...courseware.questions];
      const insertIndex = Math.min(destination.index, newQuestions.length);
      newQuestions.splice(insertIndex, 0, newQuestion);
      
      setCourseware(prev => ({ ...prev, questions: newQuestions }));
      setSelectedQuestionId(newQuestion.id);
      return;
    }

    if (source.droppableId === 'preview' && destination.droppableId === 'preview') {
      const newQuestions = [...courseware.questions];
      const [removed] = newQuestions.splice(source.index, 1);
      newQuestions.splice(destination.index, 0, removed);
      
      setCourseware(prev => ({ ...prev, questions: newQuestions }));
    }
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setCourseware(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, ...updates } : q
      )
    }));
  };

  const deleteQuestion = (questionId: string) => {
    setCourseware(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
    if (selectedQuestionId === questionId) {
      setSelectedQuestionId(null);
    }
  };

  const addOption = (questionId: string) => {
    const question = courseware.questions.find(q => q.id === questionId);
    if (!question || question.options.length >= 5) return;
    
    const optionIndex = question.options.length;
    const optionLabel = String.fromCharCode(65 + optionIndex);
    updateQuestion(questionId, {
      options: [...question.options, `选项${optionLabel}`]
    });
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = courseware.questions.find(q => q.id === questionId);
    if (!question || question.options.length <= 2) return;
    
    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    const updates: Partial<Question> = { options: newOptions };
    
    if (question.correctAnswer !== undefined && question.correctAnswer === optionIndex) {
      updates.correctAnswer = 0;
    } else if (question.correctAnswer !== undefined && question.correctAnswer > optionIndex) {
      updates.correctAnswer = question.correctAnswer - 1;
    }
    
    updateQuestion(questionId, updates);
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = courseware.questions.find(q => q.id === questionId);
    if (!question) return;
    
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    updateQuestion(questionId, { options: newOptions });
  };

  const saveCourseware = async () => {
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      if (courseware.id) {
        await axios.put(`/api/courseware/${courseware.id}`, courseware);
        setCoursewares(prev => prev.map(c => c.id === courseware.id ? courseware : c));
      } else {
        const response = await axios.post('/api/courseware', courseware);
        const savedCourseware = response.data;
        setCourseware(savedCourseware);
        setCoursewares(prev => [...prev, savedCourseware]);
        navigate(`/edit/${savedCourseware.id}`, { replace: true });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <input
          type="text"
          value={courseware.title}
          onChange={(e) => setCourseware(prev => ({ ...prev, title: e.target.value }))}
          placeholder="请输入课件标题"
          style={styles.titleInput}
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {saveSuccess && <span style={styles.saveSuccess}>已保存</span>}
          <button
            onClick={saveCourseware}
            disabled={saving}
            style={{ ...styles.primaryButton, ...(saving ? { opacity: 0.6 } : {}) }}
          >
            {saving ? '保存中...' : '保存课件'}
          </button>
        </div>
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={styles.editorLayout}>
          <div style={styles.sidebar}>
            <div style={styles.sidebarTitle}>题目类型</div>
            <div style={styles.sidebarDivider} />
            
            <Droppable droppableId="quiz" type="sidebar" isDropDisabled={true}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} style={styles.droppableSidebar}>
                  <Draggable draggableId="quiz-drag" index={0}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...styles.dragItem,
                          ...styles.quizItem,
                          opacity: snapshot.isDragging ? 0.6 : 1,
                          transform: snapshot.isDragging ? 'scale(0.95)' : 'scale(1)',
                          transition: 'opacity 0.1s, transform 0.1s',
                          cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                          ...provided.draggableProps.style
                        }}
                      >
                        <span style={styles.dragIcon}>📝</span>
                        <span>测验题 (Quiz)</span>
                      </div>
                    )}
                  </Draggable>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <Droppable droppableId="vote" type="sidebar" isDropDisabled={true}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} style={styles.droppableSidebar}>
                  <Draggable draggableId="vote-drag" index={0}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...styles.dragItem,
                          ...styles.voteItem,
                          opacity: snapshot.isDragging ? 0.6 : 1,
                          transform: snapshot.isDragging ? 'scale(0.95)' : 'scale(1)',
                          transition: 'opacity 0.1s, transform 0.1s',
                          cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                          ...provided.draggableProps.style
                        }}
                      >
                        <span style={styles.dragIcon}>🗳️</span>
                        <span>投票题 (Vote)</span>
                      </div>
                    )}
                  </Draggable>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            <div style={styles.sidebarTip}>
              <p style={styles.sidebarTipTitle}>使用提示</p>
              <p style={styles.sidebarTipText}>拖拽题目类型到预览区添加新题目</p>
            </div>
          </div>

          <div style={styles.previewArea}>
            <div style={styles.previewHeader}>
              <span style={styles.previewTitle}>课件预览</span>
              <span style={styles.questionCount}>共 {courseware.questions.length} 道题</span>
            </div>
            
            <Droppable droppableId="preview" type="preview">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    ...styles.previewContent,
                    backgroundColor: snapshot.isDraggingOver ? '#F5F9FF' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {courseware.questions.length === 0 ? (
                    <div style={styles.emptyPreview}>
                      <div style={styles.emptyIcon}>📋</div>
                      <p style={styles.emptyText}>从左侧拖拽题目类型到这里添加题目</p>
                    </div>
                  ) : (
                    courseware.questions.map((question, index) => (
                      <Draggable key={question.id} draggableId={question.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...styles.questionCard,
                              ...(selectedQuestionId === question.id ? styles.questionCardSelected : {}),
                              opacity: snapshot.isDragging ? 0.8 : 1,
                              cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                              ...provided.draggableProps.style
                            }}
                            onClick={() => setSelectedQuestionId(question.id)}
                          >
                            <div style={styles.questionCardHeader}>
                              <div style={styles.questionTypeBadge}>
                                {question.type === 'quiz' ? '📝 测验题' : '🗳️ 投票题'}
                              </div>
                              <div style={styles.questionActions}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedQuestionId(question.id);
                                  }}
                                  style={styles.iconButton}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteQuestion(question.id);
                                  }}
                                  style={{ ...styles.iconButton, color: '#E57373' }}
                                >
                                  🗑️
                                </button>
                                <div {...provided.dragHandleProps} style={styles.dragHandle}>
                                  ⋮⋮
                                </div>
                              </div>
                            </div>
                            
                            <div style={styles.questionPrompt}>
                              {index + 1}. {question.prompt}
                            </div>
                            
                            <div style={styles.questionOptions}>
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} style={styles.optionPreview}>
                                  <span style={styles.optionLabel}>
                                    {String.fromCharCode(65 + optIndex)}.
                                  </span>
                                  <span style={styles.optionText}>{option}</span>
                                  {question.type === 'quiz' && question.correctAnswer === optIndex && (
                                    <span style={styles.correctBadge}>✓ 正确答案</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          <div style={styles.propertiesPanel}>
            <div style={styles.panelTitle}>属性面板</div>
            <div style={styles.sidebarDivider} />
            
            {selectedQuestion ? (
              <div style={styles.propertiesContent}>
                <div style={styles.propertySection}>
                  <label style={styles.propertyLabel}>题目类型</label>
                  <div style={styles.typeDisplay}>
                    {selectedQuestion.type === 'quiz' ? '📝 测验题（单选题）' : '🗳️ 投票题'}
                  </div>
                </div>

                <div style={styles.propertySection}>
                  <label style={styles.propertyLabel}>问题文本</label>
                  <textarea
                    value={selectedQuestion.prompt}
                    onChange={(e) => updateQuestion(selectedQuestion.id, { prompt: e.target.value })}
                    style={styles.textarea}
                    rows={3}
                    placeholder="请输入问题内容"
                  />
                </div>

                <div style={styles.propertySection}>
                  <div style={styles.propertyHeader}>
                    <label style={styles.propertyLabel}>选项列表</label>
                    <button
                      onClick={() => addOption(selectedQuestion.id)}
                      disabled={selectedQuestion.options.length >= 5}
                      style={{
                        ...styles.addButton,
                        ...(selectedQuestion.options.length >= 5 ? { opacity: 0.5 } : {})
                      }}
                    >
                      + 添加选项
                    </button>
                  </div>
                  
                  <div style={styles.optionsList}>
                    {selectedQuestion.options.map((option, optIndex) => (
                      <div key={optIndex} style={styles.optionEditor}>
                        <span style={styles.optionIndex}>
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(selectedQuestion.id, optIndex, e.target.value)}
                          style={styles.optionInput}
                          placeholder={`选项${String.fromCharCode(65 + optIndex)}`}
                        />
                        {selectedQuestion.type === 'quiz' && (
                          <input
                            type="radio"
                            name={`correct-${selectedQuestion.id}`}
                            checked={selectedQuestion.correctAnswer === optIndex}
                            onChange={() => updateQuestion(selectedQuestion.id, { correctAnswer: optIndex })}
                            style={styles.radioInput}
                          />
                        )}
                        <button
                          onClick={() => removeOption(selectedQuestion.id, optIndex)}
                          disabled={selectedQuestion.options.length <= 2}
                          style={{
                            ...styles.removeOptionBtn,
                            ...(selectedQuestion.options.length <= 2 ? { opacity: 0.3 } : {})
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {selectedQuestion.type === 'quiz' && (
                    <p style={styles.hintText}>选择一个选项作为正确答案</p>
                  )}
                </div>
              </div>
            ) : (
              <div style={styles.emptyProperties}>
                <div style={styles.emptyPropsIcon}>👈</div>
                <p style={styles.emptyPropsText}>选择一个问题进行编辑</p>
              </div>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 116px)',
    gap: '16px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: '16px 20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  titleInput: {
    fontSize: '20px',
    fontWeight: 600,
    border: 'none',
    outline: 'none',
    flex: 1,
    color: '#333',
    backgroundColor: 'transparent'
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: '#1976D2',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s'
  },
  saveSuccess: {
    color: '#81C784',
    fontSize: '14px'
  },
  editorLayout: {
    display: 'flex',
    flex: 1,
    gap: '16px',
    overflow: 'hidden'
  },
  sidebar: {
    width: '220px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '12px'
  },
  sidebarDivider: {
    height: '1px',
    backgroundColor: '#E0E0E0',
    marginBottom: '16px'
  },
  droppableSidebar: {
    marginBottom: '12px'
  },
  dragItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    userSelect: 'none'
  },
  quizItem: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    border: '1px solid #BBDEFB'
  },
  voteItem: {
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
    border: '1px solid #FFE0B2'
  },
  dragIcon: {
    fontSize: '18px'
  },
  sidebarTip: {
    marginTop: 'auto',
    padding: '12px',
    backgroundColor: '#F5F5F5',
    borderRadius: '6px'
  },
  sidebarTipTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#666',
    marginBottom: '6px'
  },
  sidebarTipText: {
    fontSize: '12px',
    color: '#999',
    lineHeight: 1.5
  },
  previewArea: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #E0E0E0'
  },
  previewTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333'
  },
  questionCount: {
    fontSize: '13px',
    color: '#999'
  },
  previewContent: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  emptyPreview: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: '14px'
  },
  questionCard: {
    backgroundColor: '#fff',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    padding: '16px',
    transition: 'border-color 0.3s, box-shadow 0.3s'
  },
  questionCardSelected: {
    borderColor: '#1976D2',
    boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)',
    animation: 'fadeIn 0.3s ease'
  },
  questionCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  questionTypeBadge: {
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '4px',
    backgroundColor: '#F5F5F5',
    color: '#666',
    fontWeight: 500
  },
  questionActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },
  dragHandle: {
    cursor: 'grab',
    color: '#999',
    fontSize: '14px',
    padding: '4px',
    userSelect: 'none'
  },
  questionPrompt: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#333',
    marginBottom: '12px',
    lineHeight: 1.5
  },
  questionOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  optionPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#555'
  },
  optionLabel: {
    fontWeight: 500,
    color: '#888',
    width: '20px'
  },
  optionText: {
    flex: 1
  },
  correctBadge: {
    fontSize: '12px',
    padding: '2px 8px',
    backgroundColor: '#E8F5E9',
    color: '#4CAF50',
    borderRadius: '4px'
  },
  propertiesPanel: {
    width: '300px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    padding: '16px',
    paddingBottom: '12px'
  },
  propertiesContent: {
    flex: 1,
    padding: '0 16px 16px',
    overflowY: 'auto'
  },
  propertySection: {
    marginBottom: '20px'
  },
  propertyLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#666',
    marginBottom: '8px'
  },
  propertyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  typeDisplay: {
    padding: '10px 12px',
    backgroundColor: '#F5F5F5',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#555'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  addButton: {
    padding: '6px 12px',
    backgroundColor: '#1976D2',
    color: '#fff',
    borderRadius: '6px',
    fontSize: '12px',
    transition: 'background-color 0.2s'
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  optionEditor: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  optionIndex: {
    width: '20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#888'
  },
  optionInput: {
    flex: 1,
    padding: '8px 10px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  radioInput: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  removeOptionBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#FFEBEE',
    color: '#E57373',
    fontSize: '16px',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none'
  },
  hintText: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#999'
  },
  emptyProperties: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    padding: '20px'
  },
  emptyPropsIcon: {
    fontSize: '40px',
    marginBottom: '12px'
  },
  emptyPropsText: {
    fontSize: '14px',
    textAlign: 'center'
  }
};

export default Editor;
