import Papa from 'papaparse';

export interface ParsedData {
  fields: string[];
  rows: Record<string, string | number>[];
}

export interface ParseResult {
  success: boolean;
  data: ParsedData | null;
  error: string | null;
}

const MAX_ROWS = 1000;
const MAX_COLS = 20;

function tryConvertNumber(value: string): string | number {
  if (value === '' || value === null || value === undefined) return value;
  const trimmed = value.trim();
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;
  return value;
}

export function parseCSV(rawText: string): ParseResult {
  if (!rawText || !rawText.trim()) {
    return { success: false, data: null, error: '输入数据为空' };
  }

  try {
    const detectedDelimiter = detectDelimiter(rawText);
    const result = Papa.parse(rawText, {
      header: true,
      delimiter: detectedDelimiter,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (result.errors.length > 0) {
      const criticalErrors = result.errors.filter(
        (e) => e.type === 'Quotes' || e.type === 'FieldMismatch'
      );
      if (criticalErrors.length > 0 && result.data.length === 0) {
        return {
          success: false,
          data: null,
          error: `解析错误：${criticalErrors[0].message}`,
        };
      }
    }

    let fields = result.meta.fields || [];
    if (fields.length === 0) {
      return { success: false, data: null, error: '未检测到列名，请确保首行为字段名' };
    }

    if (fields.length > MAX_COLS) {
      fields = fields.slice(0, MAX_COLS);
    }

    let rows = result.data as Record<string, string>[];
    if (rows.length > MAX_ROWS) {
      rows = rows.slice(0, MAX_ROWS);
    }

    const processedRows: Record<string, string | number>[] = rows.map((row) => {
      const processed: Record<string, string | number> = {};
      for (const field of fields) {
        processed[field] = tryConvertNumber(row[field]);
      }
      return processed;
    });

    return {
      success: true,
      data: { fields, rows: processedRows },
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: `解析异常：${err instanceof Error ? err.message : '未知错误'}`,
    };
  }
}

function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;

  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  if (semicolonCount > commaCount) return ';';
  return ',';
}

export function isNumericField(
  rows: Record<string, string | number>[],
  field: string
): boolean {
  let numericCount = 0;
  const sampleSize = Math.min(rows.length, 50);
  for (let i = 0; i < sampleSize; i++) {
    if (typeof rows[i][field] === 'number') numericCount++;
  }
  return sampleSize > 0 && numericCount / sampleSize > 0.5;
}
