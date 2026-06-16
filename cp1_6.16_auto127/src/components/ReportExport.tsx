import { useState } from 'react';
import jsPDF from 'jspdf';
import axios from 'axios';

type ReportExportProps = {
  petId: string;
};

export default function ReportExport({ petId }: ReportExportProps) {
  const [loading, setLoading] = useState(false);

  async function generateReport() {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/report/${petId}`);
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFontSize(20);
      const title = '\u865a\u62df\u8bd5\u517b\u8bc4\u4f30\u62a5\u544a';
      doc.text(title, (pageW - doc.getTextWidth(title)) / 2, 20);

      doc.setFontSize(14);
      doc.text('\u95ee\u5377\u6458\u8981', 14, 35);
      doc.setFontSize(11);
      const q = data.pet.questionnaire;
      const qFields: [string, string][] = [
        ['\u5ba0\u7269\u7c7b\u578b', q.petType === 'cat' ? '\u732b' : '\u72d7'],
        ['\u5c45\u4f4f\u7a7a\u95f4', `${q.livingSpace}m\u00b2`],
        ['\u6bcf\u65e5\u5916\u51fa\u65f6\u957f', `${q.awayHours}\u5c0f\u65f6`],
        ['\u662f\u5426\u6709\u5176\u4ed6\u5ba0\u7269', q.hasOtherPets ? '\u662f' : '\u5426'],
        ['\u8fd0\u52a8\u9891\u7387', q.exerciseFrequency],
        ['\u65e5\u5e38\u4f5c\u606f', `${q.dailySchedule}`],
        ['\u517b\u5ba0\u7ecf\u9a8c', q.petExperience],
      ];
      let y = 42;
      for (const [field, value] of qFields) {
        doc.text(`${field}: ${value}`, 14, y);
        y += 7;
      }

      y += 3;
      doc.setFontSize(14);
      doc.text('7\u65e5\u72b6\u6001\u53d8\u5316', 14, y);
      y += 7;

      const chartX = 20;
      const chartW = 150;
      const chartH = 55;
      doc.line(chartX, y, chartX, y + chartH);
      doc.line(chartX, y + chartH, chartX + chartW, y + chartH);

      const metrics = ['hunger', 'energy', 'social', 'hygiene'] as const;
      const colors: [number, number, number][] = [
        [244, 67, 54],
        [33, 150, 243],
        [255, 152, 0],
        [76, 175, 80],
      ];
      const labels = ['\u9965\u997f', '\u7cbe\u529b', '\u793e\u4ea4', '\u536b\u751f'];
      const current = data.pet.state;
      const historyLen = data.history?.length || 0;

      const stateData: Record<string, number[]> = {};
      for (const m of metrics) {
        stateData[m] = [];
        for (let d = 0; d < 7; d++) {
          const base = current[m];
          const rate = d < historyLen ? data.history[d].completionRate : 0.5;
          const variation = Math.sin(d * 1.5 + metrics.indexOf(m)) * 12;
          const val = Math.min(100, Math.max(0, base - 15 + d * 4 * rate + variation));
          stateData[m].push(val);
        }
      }

      doc.setFontSize(8);
      doc.setTextColor(100);
      for (let v = 0; v <= 100; v += 25) {
        const ly = y + chartH - (v / 100) * chartH;
        doc.text(`${v}`, chartX - 8, ly + 1);
        doc.setDrawColor(200);
        doc.line(chartX, ly, chartX + chartW, ly);
        doc.setDrawColor(0);
      }

      for (let i = 0; i < 7; i++) {
        const lx = chartX + (i / 6) * chartW;
        doc.setTextColor(100);
        doc.text(`Day${i + 1}`, lx - 4, y + chartH + 5);
      }

      for (let mi = 0; mi < metrics.length; mi++) {
        const m = metrics[mi];
        doc.setDrawColor(...colors[mi]);
        doc.setLineWidth(0.6);
        const points = stateData[m].map((v, i) => ({
          x: chartX + (i / 6) * chartW,
          y: y + chartH - (v / 100) * chartH,
        }));
        for (let i = 0; i < points.length - 1; i++) {
          doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
        }
        doc.setFillColor(...colors[mi]);
        doc.circle(chartX + chartW + 5, y + mi * 7 + 2, 2, 'F');
        doc.setTextColor(...colors[mi]);
        doc.text(labels[mi], chartX + chartW + 9, y + mi * 7 + 3.5);
      }

      doc.setLineWidth(0.2);
      doc.setDrawColor(0);
      doc.setTextColor(0, 0, 0);

      y += chartH + 15;
      doc.setFontSize(14);
      doc.text('\u4efb\u52a1\u5b8c\u6210\u7387', 14, y);

      const completed = data.tasks.filter((t: { completed: boolean }) => t.completed).length;
      const incomplete = data.tasks.length - completed;
      const total = data.tasks.length || 1;
      const completedRatio = completed / total;

      const pieX = 80;
      const pieY = y + 40;
      const pieR = 25;

      function drawSegment(
        startAngle: number,
        endAngle: number,
        fillColor: [number, number, number],
      ) {
        doc.setFillColor(...fillColor);
        const steps = 40;
        for (let i = 0; i < steps; i++) {
          const a1 = startAngle + ((endAngle - startAngle) * i) / steps;
          const a2 = startAngle + ((endAngle - startAngle) * (i + 1)) / steps;
          const x1 = pieX + pieR * Math.cos(a1);
          const y1 = pieY + pieR * Math.sin(a1);
          const x2 = pieX + pieR * Math.cos(a2);
          const y2 = pieY + pieR * Math.sin(a2);
          doc.triangle(pieX, pieY, x1, y1, x2, y2, 'F');
        }
      }

      const completedAngle = completedRatio * 2 * Math.PI;
      drawSegment(-Math.PI / 2, -Math.PI / 2 + completedAngle, [76, 175, 80]);
      drawSegment(-Math.PI / 2 + completedAngle, -Math.PI / 2 + 2 * Math.PI, [255, 87, 34]);

      doc.setDrawColor(255);
      doc.setLineWidth(0.3);
      doc.circle(pieX, pieY, pieR, 'S');

      doc.setFontSize(10);
      doc.setTextColor(76, 175, 80);
      doc.setFillColor(76, 175, 80);
      doc.rect(pieX + pieR + 8, pieY - 8, 4, 4, 'F');
      doc.text(`\u5df2\u5b8c\u6210: ${completed} (${Math.round(completedRatio * 100)}%)`, pieX + pieR + 14, pieY - 4);

      doc.setTextColor(255, 87, 34);
      doc.setFillColor(255, 87, 34);
      doc.rect(pieX + pieR + 8, pieY + 2, 4, 4, 'F');
      const incompleteRatio = 1 - completedRatio;
      doc.text(`\u672a\u5b8c\u6210: ${incomplete} (${Math.round(incompleteRatio * 100)}%)`, pieX + pieR + 14, pieY + 6);

      doc.save('\u865a\u62df\u8bd5\u517b\u62a5\u544a.pdf');
    } catch {
      console.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={generateReport}
      disabled={loading}
      style={{
        backgroundColor: '#1976D2',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        padding: '10px 24px',
        fontSize: 16,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'transform 0.2s, opacity 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!loading) (e.currentTarget.style.transform = 'scale(1.05)');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseDown={(e) => {
        if (!loading) e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        if (!loading) e.currentTarget.style.transform = 'scale(1.05)';
      }}
    >
      {loading ? '\u751f\u6210\u4e2d...' : '\u5bfc\u51fa\u62a5\u544a'}
    </button>
  );
}
