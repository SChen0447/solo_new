import express from 'express';
import cors from 'cors';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { analyzeFile, analyzeProject, AnalysisResult, FileAnalysisResult } from './analyzer';

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 .zip 格式的文件'));
    }
  },
});

const codeExtensions = ['.js', '.ts', '.tsx', '.jsx', '.jsx', '.mjs', '.cjs'];

interface AnalysisSession {
  result: AnalysisResult | null;
  modifiedFiles: Map<string, string>;
}

const sessions = new Map<string, AnalysisSession>();

function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function extractCodeFromZip(buffer: Buffer): { name: string; path: string; content: string }[] {
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();
  const files: { name: string; path: string; content: string }[] = [];

  for (const entry of zipEntries) {
    if (!entry.isDirectory) {
      const ext = path.extname(entry.name).toLowerCase();
      if (codeExtensions.includes(ext)) {
        const content = entry.getData().toString('utf-8');
        const fileName = path.basename(entry.name);
        files.push({
          name: fileName,
          path: entry.entryName,
          content,
        });
      }
    }
  }

  return files;
}

app.post('/api/analyze/file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传文件' });
      return;
    }

    const files = extractCodeFromZip(req.file.buffer);

    if (files.length === 0) {
      res.status(400).json({ error: '压缩包中未找到支持的代码文件 (.js, .ts, .tsx, .jsx)' });
      return;
    }

    const sessionId = generateSessionId();
    const result = analyzeProject(files);

    const modifiedFiles = new Map<string, string>();
    for (const file of files) {
      modifiedFiles.set(file.path, file.content);
    }

    sessions.set(sessionId, { result, modifiedFiles });

    res.json({
      sessionId,
      result,
      fileCount: files.length,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({ error: '文件解析失败，请检查文件格式是否正确' });
  }
});

app.post('/api/analyze/text', (req, res) => {
  try {
    const { code, fileName = 'code.ts', base64 = false } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: '请提供代码内容' });
      return;
    }

    let codeContent = code;
    if (base64) {
      codeContent = Buffer.from(code, 'base64').toString('utf-8');
    }

    const ext = path.extname(fileName).toLowerCase();
    if (ext && !codeExtensions.includes(ext)) {
      res.status(400).json({ error: '不支持的文件格式' });
      return;
    }

    const sessionId = generateSessionId();
    const result = analyzeFile(fileName, fileName, codeContent);

    const analysisResult: AnalysisResult = {
      overall: {
        totalFiles: 1,
        totalLines: result.totalLines,
        totalCodeLines: result.codeLines,
        totalCommentLines: result.commentLines,
        overallCoverage: result.coverage,
        averageAccuracy: result.accuracyScore,
      },
      files: [result],
    };

    const modifiedFiles = new Map<string, string>();
    modifiedFiles.set(fileName, codeContent);

    sessions.set(sessionId, { result: analysisResult, modifiedFiles });

    res.json({
      sessionId,
      result: analysisResult,
    });
  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({ error: '代码分析失败' });
  }
});

app.post('/api/apply-suggestion', (req, res) => {
  try {
    const { sessionId, filePath, lineNumber, suggestion, action } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      res.status(404).json({ error: '会话不存在或已过期' });
      return;
    }

    const session = sessions.get(sessionId)!;
    const modifiedFiles = session.modifiedFiles;

    if (!modifiedFiles.has(filePath)) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    if (action === 'apply') {
      const originalCode = modifiedFiles.get(filePath)!;
      const lines = originalCode.split('\n');

      if (lineNumber < 1 || lineNumber > lines.length) {
        res.status(400).json({ error: '行号无效' });
        return;
      }

      const lineIndex = lineNumber - 1;
      const originalLine = lines[lineIndex];
      const commentIndex = findSingleLineCommentIndex(originalLine);

      let newLine: string;
      if (commentIndex !== -1) {
        if (suggestion && suggestion.trim().length > 0) {
          newLine = originalLine.substring(0, commentIndex) + '// ' + suggestion;
        } else {
          newLine = originalLine.substring(0, commentIndex).trimEnd();
        }
      } else {
        if (suggestion && suggestion.trim().length > 0) {
          newLine = originalLine + ' // ' + suggestion;
        } else {
          newLine = originalLine;
        }
      }

      lines[lineIndex] = newLine;
      const newCode = lines.join('\n');
      modifiedFiles.set(filePath, newCode);

      const updatedFileResult = analyzeFile(
        path.basename(filePath),
        filePath,
        newCode
      );

      if (session.result) {
        const fileIndex = session.result.files.findIndex(f => f.filePath === filePath);
        if (fileIndex !== -1) {
          session.result.files[fileIndex] = updatedFileResult;
          session.result.overall = recalculateOverall(session.result.files);
        }
      }

      res.json({
        success: true,
        newCode,
        fileResult: updatedFileResult,
        overall: session.result?.overall,
      });
    } else if (action === 'revert') {
      const originalFile = session.result?.files.find(f => f.filePath === filePath);
      if (originalFile) {
        modifiedFiles.set(filePath, originalFile.code);

        const revertedFileResult = analyzeFile(
          path.basename(filePath),
          filePath,
          originalFile.code
        );

        if (session.result) {
          const fileIndex = session.result.files.findIndex(f => f.filePath === filePath);
          if (fileIndex !== -1) {
            session.result.files[fileIndex] = revertedFileResult;
            session.result.overall = recalculateOverall(session.result.files);
          }
        }

        res.json({
          success: true,
          revertedCode: originalFile.code,
          fileResult: revertedFileResult,
          overall: session.result?.overall,
        });
      } else {
        res.status(404).json({ error: '原始文件未找到' });
      }
    } else {
      res.status(400).json({ error: '无效的操作类型' });
    }
  } catch (error) {
    console.error('Apply suggestion error:', error);
    res.status(500).json({ error: '应用建议失败' });
  }
});

function findSingleLineCommentIndex(line: string): number {
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (inString) {
      if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '/' && line[i + 1] === '/') {
      return i;
    }
  }

  return -1;
}

function recalculateOverall(files: FileAnalysisResult[]) {
  const totalFiles = files.length;
  const totalLines = files.reduce((sum, f) => sum + f.totalLines, 0);
  const totalCodeLines = files.reduce((sum, f) => sum + f.codeLines, 0);
  const totalCommentLines = files.reduce((sum, f) => sum + f.commentLines, 0);
  const overallCoverage = totalCodeLines > 0 ? (totalCommentLines / totalCodeLines) * 100 : 0;
  const averageAccuracy = totalFiles > 0 ? files.reduce((sum, f) => sum + f.accuracyScore, 0) / totalFiles : 0;

  return {
    totalFiles,
    totalLines,
    totalCodeLines,
    totalCommentLines,
    overallCoverage: Math.round(overallCoverage * 100) / 100,
    averageAccuracy: Math.round(averageAccuracy),
  };
}

app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    res.status(404).json({ error: '会话不存在或已过期' });
    return;
  }

  res.json({
    result: session.result,
    modifiedFiles: Array.from(session.modifiedFiles.keys()),
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API endpoints: POST /api/analyze/file, POST /api/analyze/text`);
});
