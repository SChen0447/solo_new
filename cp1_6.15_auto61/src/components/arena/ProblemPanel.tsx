import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface ProblemPanelProps {
  title: string;
  description: string;
}

export default function ProblemPanel({ title, description }: ProblemPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="glass p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-arena-accent" />
          <h3 className="font-display text-sm font-semibold text-arena-accent">
            {title}
          </h3>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-arena-muted" />
        ) : (
          <ChevronUp className="w-4 h-4 text-arena-muted" />
        )}
      </div>
      {!collapsed && (
        <div className="mt-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          {description}
        </div>
      )}
    </div>
  );
}
