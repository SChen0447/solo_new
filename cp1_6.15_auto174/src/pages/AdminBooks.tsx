import { useState, useRef } from 'react';
import { Upload, BookOpen } from 'lucide-react';
import axios from 'axios';
import { useNotificationStore } from '@/stores/notificationStore';

export default function AdminBooks() {
  const { addNotification } = useNotificationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    isbn: '',
    totalCopies: 1,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCoverChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addNotification('请上传图片文件', 'warning');
      return;
    }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCoverChange(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim()) {
      addNotification('请填写必填字段', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('author', form.author);
      formData.append('description', form.description);
      formData.append('isbn', form.isbn);
      formData.append('totalCopies', String(form.totalCopies));
      if (coverFile) formData.append('cover', coverFile);

      await axios.post('/api/admin/books', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      addNotification('书籍入库成功！', 'success');
      setForm({ title: '', author: '', description: '', isbn: '', totalCopies: 1 });
      setCoverFile(null);
      setCoverPreview(null);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        addNotification(err.response?.data?.error ?? '入库失败', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 transition-colors duration-200 placeholder:text-gray-400 focus:border-primary-light focus:outline-none';

  return (
    <div className="mx-auto max-w-[700px] px-6 pt-[84px] pb-12 animate-fadeIn">
      <h1 className="mb-6 text-xl font-bold text-gray-800">新书入库</h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-modal bg-[#f9f9fb] p-8"
        style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">书名 *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="请输入书名"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">作者 *</label>
          <input
            type="text"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            placeholder="请输入作者"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">简介</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="请输入简介"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">ISBN</label>
            <input
              type="text"
              value={form.isbn}
              onChange={(e) => setForm({ ...form, isbn: e.target.value })}
              placeholder="ISBN"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">藏书量</label>
            <input
              type="number"
              min={1}
              value={form.totalCopies}
              onChange={(e) => setForm({ ...form, totalCopies: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">封面图片</label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors duration-200 ${
              dragOver
                ? 'border-primary-light bg-[#eef2ff]'
                : 'border-primary-light bg-white'
            } ${coverPreview ? 'p-4' : 'h-[160px]'}`}
          >
            {coverPreview ? (
              <div className="flex items-center gap-4">
                <img
                  src={coverPreview}
                  alt="封面预览"
                  className="h-[120px] w-[120px] rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-sm text-primary-light hover:underline"
                >
                  替换图片
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Upload className="h-8 w-8" />
                <span className="text-sm">点击或拖拽上传封面</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCoverChange(file);
            }}
            className="hidden"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">二维码预览</label>
          <div className="flex items-center justify-center">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <rect width="140" height="140" rx="8" fill="#f5f5f7" />
              <rect x="20" y="20" width="40" height="40" rx="4" fill="#667eea" />
              <rect x="80" y="20" width="40" height="40" rx="4" fill="#667eea" />
              <rect x="20" y="80" width="40" height="40" rx="4" fill="#667eea" />
              <rect x="30" y="30" width="20" height="20" rx="2" fill="#fff" />
              <rect x="90" y="30" width="20" height="20" rx="2" fill="#fff" />
              <rect x="30" y="90" width="20" height="20" rx="2" fill="#fff" />
              <rect x="85" y="85" width="10" height="10" rx="2" fill="#667eea" />
              <rect x="100" y="85" width="10" height="10" rx="2" fill="#667eea" />
              <rect x="85" y="100" width="10" height="10" rx="2" fill="#667eea" />
              <rect x="100" y="100" width="10" height="10" rx="2" fill="#667eea" />
              <circle cx="70" cy="70" r="14" fill="#667eea" />
              <BookOpen className="text-white" x="60" y="60" width="20" height="20" />
            </svg>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 h-11 rounded-button bg-gradient-to-r from-primary-light to-primary-dark text-sm font-medium text-white transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          {submitting ? '提交中...' : '入库'}
        </button>
      </form>
    </div>
  );
}
