import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ScoreBoardProps {
  myPassed: number;
  opponentPassed: number;
  totalCases: number;
  myNickname: string;
  opponentNickname: string;
}

export default function ScoreBoard({
  myPassed,
  opponentPassed,
  totalCases,
  myNickname,
  opponentNickname,
}: ScoreBoardProps) {
  const data = [
    { name: myNickname, cases: myPassed },
    { name: opponentNickname, cases: opponentPassed },
  ];

  return (
    <div className="glass p-4">
      <h4 className="text-xs font-display text-arena-muted mb-2 uppercase tracking-wider">
        通过用例
      </h4>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis
              dataKey="name"
              tick={{ fill: '#4a4a6a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, totalCases]}
              tick={{ fill: '#4a4a6a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={25}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid #2a2a4a',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="cases" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <motion.g key={index}>
                  <Cell fill={index === 0 ? '#00d4ff' : '#ff6b6b'} />
                </motion.g>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-arena-accent">{myPassed}/{totalCases}</span>
        <span className="text-arena-danger">{opponentPassed}/{totalCases}</span>
      </div>
    </div>
  );
}
