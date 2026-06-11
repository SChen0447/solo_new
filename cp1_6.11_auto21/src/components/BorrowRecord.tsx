import { useState } from 'react';
import type { BorrowRecord as BorrowRecordType, BorrowFormData } from '@/types';

interface BorrowRecordProps {
  records: BorrowRecordType[];
  bookStatus: 'available' | 'borrowed';
  onBorrow: (data: BorrowFormData) => void;
  onReturn: () => void;
}

export const BorrowRecord = ({ records, bookStatus, onBorrow, onReturn }: BorrowRecordProps) => {
  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [formError, setFormError] = useState('');

  const handleBorrowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowerName.trim()) {
      setFormError('请输入借阅人姓名');
      return;
    }
    if (!expectedReturnDate) {
      setFormError('请选择预计归还日期');
      return;
    }
    onBorrow({
      borrowerName: borrowerName.trim(),
      expectedReturnDate,
    });
    setBorrowerName('');
    setExpectedReturnDate('');
    setShowBorrowForm(false);
    setFormError('');
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="borrow-record-section">
      <div className="record-actions">
        {bookStatus === 'available' ? (
          <>
            {!showBorrowForm ? (
              <button
                type="button"
                className="btn btn-borrow"
                onClick={() => setShowBorrowForm(true)}
              >
                📤 借出书籍
              </button>
            ) : (
              <form className="borrow-form" onSubmit={handleBorrowSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="borrower">借阅人 <span className="required">*</span></label>
                    <input
                      id="borrower"
                      type="text"
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      placeholder="请输入姓名"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="returnDate">预计归还 <span className="required">*</span></label>
                    <input
                      id="returnDate"
                      type="date"
                      min={today}
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                    />
                  </div>
                </div>
                {formError && <span className="error-text">{formError}</span>}
                <div className="form-actions inline">
                  <button
                    type="button"
                    className="btn btn-secondary small"
                    onClick={() => {
                      setShowBorrowForm(false);
                      setBorrowerName('');
                      setExpectedReturnDate('');
                      setFormError('');
                    }}
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-borrow small">
                    确认借出
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <button
            type="button"
            className="btn btn-return"
            onClick={onReturn}
          >
            📥 标记归还
          </button>
        )}
      </div>

      <div className="history-section">
        <h4 className="history-title">借阅历史</h4>
        {records.length === 0 ? (
          <p className="no-history">暂无借阅记录</p>
        ) : (
          <ul className="history-list">
            {records.map((record) => (
              <li
                key={record.id}
                className={`history-item ${record.isReturned ? 'returned' : 'active'}`}
              >
                <div className="history-header">
                  <span className="borrower-name">👤 {record.borrowerName}</span>
                  <span className={`history-status ${record.isReturned ? 'done' : 'pending'}`}>
                    {record.isReturned ? '已归还' : '借阅中'}
                  </span>
                </div>
                <div className="history-dates">
                  <span>借出: {record.borrowDate}</span>
                  <span>预计: {record.expectedReturnDate}</span>
                  {record.returnDate && <span>归还: {record.returnDate}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
