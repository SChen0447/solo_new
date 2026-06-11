import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Idea } from '../../shared/types';

interface Props {
  ideas: Idea[];
}

export default function VoteChart({ ideas }: Props) {
  const data = ideas.map(idea => ({
    name: idea.content.length > 15 ? idea.content.slice(0, 15) + '...' : idea.content,
    fullName: idea.content,
    赞同: idea.upvotes,
    反对: idea.downvotes,
    author: idea.authorNickname
  }));

  const maxVal = Math.max(1, ...ideas.flatMap(i => [i.upvotes, i.downvotes]));

  const customTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: '#16213e',
        border: '1px solid #e94560',
        padding: '10px 14px',
        borderRadius: 6,
        fontSize: 13,
        color: '#fff',
        maxWidth: 260
      }}>
        <div style={{ color: '#e94560', fontWeight: 600, marginBottom: 6 }}>
          {d.author}
        </div>
        <div style={{ marginBottom: 6, lineHeight: 1.4 }}>{d.fullName}</div>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} style={{ color: entry.color, margin: '2px 0' }}>
            {entry.name}: {entry.value}
          </div>
        ))}
      </div>
    );
  };

  if (ideas.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#666',
        fontSize: 14
      }}>
        暂无想法，等待成员提交中...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
        barCategoryGap="25%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" horizontal={true} vertical={false} />
        <XAxis type="number" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} domain={[0, maxVal]} />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#888"
          tick={{ fill: '#ccc', fontSize: 11 }}
          width={80}
        />
        <Tooltip content={customTooltip} cursor={{ fill: 'rgba(233,69,96,0.08)' }} />
        <Bar dataKey="赞同" animationDuration={400} animationEasing="ease-out" isAnimationActive={true}>
          {data.map((_, idx) => (
            <Cell key={`u-${idx}`} fill="#4ade80" />
          ))}
        </Bar>
        <Bar dataKey="反对" animationDuration={400} animationEasing="ease-out" isAnimationActive={true}>
          {data.map((_, idx) => (
            <Cell key={`d-${idx}`} fill="#ef4444" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
