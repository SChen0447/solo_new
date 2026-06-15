interface CSVRow {
  [key: string]: string;
}

interface ParsedTransaction {
  amount: number;
  date: string;
  note: string;
  category: string;
  type: 'expense' | 'income';
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '餐饮': ['餐', '食', '饭', '外卖', '奶茶', '咖啡', '超市', '水果', '零食', '麦当劳', '肯德基', '星巴克', '美团', '饿了么'],
  '交通': ['地铁', '公交', '出租', '滴滴', '加油', '停车', '高速', '火车', '机票', '航空', '铁路'],
  '购物': ['淘宝', '京东', '拼多多', '亚马逊', '商城', '百货'],
  '娱乐': ['电影', '游戏', '音乐', 'KTV', '酒吧', '演出'],
  '居住': ['房租', '物业', '水费', '电费', '燃气', '维修', '装修'],
  '医疗': ['医院', '药', '体检', '挂号', '诊所'],
  '教育': ['学费', '培训', '书', '课程', '考试'],
  '通讯': ['话费', '流量', '宽带', '会员'],
  '服饰': ['衣', '鞋', '包', '首饰', '眼镜'],
  '美容': ['理发', '美发', '护肤', '化妆', '美甲', 'SPA'],
  '运动': ['健身', '瑜伽', '游泳', '跑步', '球'],
  '旅行': ['酒店', '民宿', '景点', '签证'],
  '社交': ['红包', '礼金', '请客', '聚会'],
  '宠物': ['猫', '狗', '宠物', '兽医'],
  '其他': [],
};

function autoClassify(note: string): string {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (note.includes(keyword)) {
        return category;
      }
    }
  }
  return '';
}

export function parseCSV(csvText: string): { parsed: ParsedTransaction[]; unmatched: { index: number; row: CSVRow }[] } {
  const lines = csvText.split('\n');
  if (lines.length < 2) return { parsed: [], unmatched: [] };

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const parsed: ParsedTransaction[] = [];
  const unmatched: { index: number; row: CSVRow }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: CSVRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    const amount = Math.abs(parseFloat(row['金额'] || row['amount'] || row['Amount'] || '0'));
    const date = row['日期'] || row['date'] || row['Date'] || new Date().toISOString().slice(0, 10);
    const note = row['备注'] || row['note'] || row['Description'] || row['描述'] || '';
    const type: 'expense' | 'income' = amount > 0 && (row['类型'] || row['type'] || '').includes('收') ? 'income' : 'expense';

    const category = autoClassify(note);
    if (!category) {
      unmatched.push({ index: i, row });
    }

    parsed.push({
      amount,
      date,
      note,
      category: category || '其他',
      type,
    });
  }

  return { parsed, unmatched };
}

export function createCSVWorker(): Worker {
  const workerCode = `
    self.onmessage = function(e) {
      const csvText = e.data;
      const lines = csvText.split('\\n');
      if (lines.length < 2) {
        self.postMessage({ parsed: [], unmatched: [] });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const parsed = [];
      const unmatched = [];

      const CATEGORY_KEYWORDS = {
        '餐饮': ['餐','食','饭','外卖','奶茶','咖啡','超市','水果','零食','麦当劳','肯德基','星巴克','美团','饿了么'],
        '交通': ['地铁','公交','出租','滴滴','加油','停车','高速','火车','机票','航空','铁路'],
        '购物': ['淘宝','京东','拼多多','亚马逊','商城','百货'],
        '娱乐': ['电影','游戏','音乐','KTV','酒吧','演出'],
        '居住': ['房租','物业','水费','电费','燃气','维修','装修'],
        '医疗': ['医院','药','体检','挂号','诊所'],
        '教育': ['学费','培训','书','课程','考试'],
        '通讯': ['话费','流量','宽带','会员'],
        '服饰': ['衣','鞋','包','首饰','眼镜'],
        '美容': ['理发','美发','护肤','化妆','美甲','SPA'],
        '运动': ['健身','瑜伽','游泳','跑步','球'],
        '旅行': ['酒店','民宿','景点','签证'],
        '社交': ['红包','礼金','请客','聚会'],
        '宠物': ['猫','狗','宠物','兽医'],
        '其他': [],
      };

      function autoClassify(note) {
        for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
          for (const keyword of keywords) {
            if (note.includes(keyword)) return category;
          }
        }
        return '';
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') { inQuotes = !inQuotes; }
          else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
          else { current += char; }
        }
        values.push(current.trim());

        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        const amount = Math.abs(parseFloat(row['金额'] || row['amount'] || row['Amount'] || '0'));
        const date = row['日期'] || row['date'] || row['Date'] || new Date().toISOString().slice(0, 10);
        const note = row['备注'] || row['note'] || row['Description'] || row['描述'] || '';
        const type = amount > 0 && (row['类型'] || row['type'] || '').includes('收') ? 'income' : 'expense';
        const category = autoClassify(note);

        if (!category) {
          unmatched.push({ index: i, row });
        }

        parsed.push({ amount, date, note, category: category || '其他', type });
      }

      self.postMessage({ parsed, unmatched });
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}
