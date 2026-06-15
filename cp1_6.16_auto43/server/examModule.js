import { v4 as uuidv4 } from "uuid";

const questionBank = [
  { id: "q1", type: "choice", difficulty: "easy", knowledgePoint: "JavaScript基础", content: "JavaScript中，以下哪个关键字用于声明常量？", options: ["var", "let", "const", "static"], answer: "C" },
  { id: "q2", type: "choice", difficulty: "easy", knowledgePoint: "JavaScript基础", content: "typeof null 的返回值是什么？", options: ["'null'", "'undefined'", "'object'", "'boolean'"], answer: "C" },
  { id: "q3", type: "choice", difficulty: "easy", knowledgePoint: "JavaScript基础", content: "以下哪个方法用于向数组末尾添加元素？", options: ["push()", "pop()", "shift()", "unshift()"], answer: "A" },
  { id: "q4", type: "judge", difficulty: "easy", knowledgePoint: "JavaScript基础", content: "JavaScript是一种强类型语言。", answer: false },
  { id: "q5", type: "judge", difficulty: "easy", knowledgePoint: "JavaScript基础", content: "=== 运算符在比较时会进行类型转换。", answer: false },
  { id: "q6", type: "choice", difficulty: "easy", knowledgePoint: "CSS布局", content: "CSS中，display: flex 的默认主轴方向是？", options: ["从上到下", "从下到上", "从左到右", "从右到左"], answer: "C" },
  { id: "q7", type: "choice", difficulty: "easy", knowledgePoint: "CSS布局", content: "以下哪个CSS属性用于设置元素的外边距？", options: ["padding", "margin", "border", "outline"], answer: "B" },
  { id: "q8", type: "judge", difficulty: "easy", knowledgePoint: "CSS布局", content: "CSS Grid是一维布局系统。", answer: false },
  { id: "q9", type: "choice", difficulty: "medium", knowledgePoint: "React框架", content: "React中，useEffect的第二个参数为空数组时，effect执行几次？", options: ["0次", "1次", "2次", "每次渲染"], answer: "B" },
  { id: "q10", type: "choice", difficulty: "medium", knowledgePoint: "React框架", content: "以下哪个Hook用于在函数组件中管理状态？", options: ["useEffect", "useContext", "useState", "useRef"], answer: "C" },
  { id: "q11", type: "choice", difficulty: "medium", knowledgePoint: "React框架", content: "React中，key属性的作用是什么？", options: ["设置样式", "标识列表元素以提高diff效率", "绑定事件", "定义组件名称"], answer: "B" },
  { id: "q12", type: "judge", difficulty: "medium", knowledgePoint: "React框架", content: "React中，可以直接修改state来更新组件。", answer: false },
  { id: "q13", type: "judge", difficulty: "medium", knowledgePoint: "React框架", content: "React Fragment可以在DOM中产生额外的节点。", answer: false },
  { id: "q14", type: "choice", difficulty: "medium", knowledgePoint: "Node.js", content: "Node.js中，以下哪个模块用于创建HTTP服务器？", options: ["fs", "path", "http", "url"], answer: "C" },
  { id: "q15", type: "choice", difficulty: "medium", knowledgePoint: "Node.js", content: "Express中间件的执行顺序是？", options: ["随机执行", "按注册顺序执行", "按字母排序执行", "异步并行执行"], answer: "B" },
  { id: "q16", type: "judge", difficulty: "medium", knowledgePoint: "Node.js", content: "Node.js是单线程的，因此无法利用多核CPU。", answer: false },
  { id: "q17", type: "choice", difficulty: "medium", knowledgePoint: "网络协议", content: "HTTP状态码304表示什么？", options: ["服务器错误", "未修改（缓存有效）", "永久重定向", "请求被拒绝"], answer: "B" },
  { id: "q18", type: "judge", difficulty: "medium", knowledgePoint: "网络协议", content: "HTTPS默认使用443端口。", answer: true },
  { id: "q19", type: "choice", difficulty: "hard", knowledgePoint: "算法", content: "快速排序的平均时间复杂度是？", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], answer: "B" },
  { id: "q20", type: "choice", difficulty: "hard", knowledgePoint: "算法", content: "以下哪种数据结构适合实现LRU缓存？", options: ["数组", "链表", "哈希表+双向链表", "栈"], answer: "C" },
  { id: "q21", type: "choice", difficulty: "hard", knowledgePoint: "算法", content: "动态规划与贪心算法的主要区别是？", options: ["时间复杂度不同", "动态规划考虑全局最优，贪心考虑局部最优", "空间复杂度不同", "适用数据类型不同"], answer: "B" },
  { id: "q22", type: "judge", difficulty: "hard", knowledgePoint: "算法", content: "二分查找的前提是数据必须有序。", answer: true },
  { id: "q23", type: "judge", difficulty: "hard", knowledgePoint: "算法", content: "归并排序是原地排序算法。", answer: false },
  { id: "q24", type: "choice", difficulty: "hard", knowledgePoint: "系统设计", content: "微服务架构中，服务间通信的最佳方式是？", options: ["共享数据库", "REST API或消息队列", "共享内存", "直接函数调用"], answer: "B" },
  { id: "q25", type: "choice", difficulty: "hard", knowledgePoint: "系统设计", content: "CAP定理指出分布式系统不可能同时满足哪三个特性？", options: ["一致性、可用性、分区容错性", "安全性、可靠性、性能", "可扩展性、可维护性、可测试性", "延迟、吞吐量、容量"], answer: "A" },
  { id: "q26", type: "judge", difficulty: "hard", knowledgePoint: "系统设计", content: "负载均衡只能通过硬件设备实现。", answer: false },
  { id: "q27", type: "choice", difficulty: "easy", knowledgePoint: "数据库", content: "SQL中，用于查询数据的关键字是？", options: ["INSERT", "UPDATE", "SELECT", "DELETE"], answer: "C" },
  { id: "q28", type: "choice", difficulty: "medium", knowledgePoint: "数据库", content: "数据库索引的主要作用是？", options: ["节省存储空间", "加快查询速度", "保证数据一致性", "简化数据结构"], answer: "B" },
  { id: "q29", type: "judge", difficulty: "medium", knowledgePoint: "数据库", content: "NoSQL数据库完全不支持事务。", answer: false },
  { id: "q30", type: "choice", difficulty: "hard", knowledgePoint: "数据库", content: "以下哪种隔离级别可以防止幻读？", options: ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"], answer: "D" },
  { id: "q31", type: "choice", difficulty: "easy", knowledgePoint: "网络协议", content: "TCP三次握手的目的是？", options: ["关闭连接", "建立可靠连接", "传输数据", "路由寻址"], answer: "B" },
  { id: "q32", type: "judge", difficulty: "easy", knowledgePoint: "CSS布局", content: "CSS中position: relative的元素会脱离文档流。", answer: false },
  { id: "q33", type: "choice", difficulty: "medium", knowledgePoint: "JavaScript基础", content: "Promise.all在其中一个Promise被reject时会？", options: ["返回所有结果", "立即reject", "等待所有完成", "忽略错误"], answer: "B" },
  { id: "q34", type: "choice", difficulty: "hard", knowledgePoint: "React框架", content: "React并发模式(Concurrent Mode)的主要目标是？", options: ["提高渲染速度", "支持可中断渲染以保持UI响应", "减少内存使用", "简化代码结构"], answer: "B" },
  { id: "q35", type: "judge", difficulty: "hard", knowledgePoint: "Node.js", content: "Node.js的Event Loop与浏览器的Event Loop完全相同。", answer: false },
];

const papers = new Map();
const examResults = new Map();

function generatePaper(difficulty, questionCount) {
  let filtered;
  if (difficulty === "easy") {
    filtered = questionBank.filter((q) => q.difficulty === "easy" || q.difficulty === "medium");
  } else if (difficulty === "hard") {
    filtered = questionBank.filter((q) => q.difficulty === "medium" || q.difficulty === "hard");
  } else {
    filtered = [...questionBank];
  }

  const shuffled = filtered.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

  const paperId = uuidv4();
  const paper = { paperId, difficulty, questionCount: selected.length, questions: selected };
  papers.set(paperId, paper);

  return paper;
}

function getPaper(paperId) {
  return papers.get(paperId);
}

function getQuestionBank() {
  return questionBank;
}

function saveExamResult(examId, result) {
  examResults.set(examId, result);
}

function getExamResult(examId) {
  return examResults.get(examId);
}

export { generatePaper, getPaper, getQuestionBank, saveExamResult, getExamResult };
