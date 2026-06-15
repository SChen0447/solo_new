import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import RankBadge from '@/components/RankBadge';
import axios from 'axios';
import { Trophy, Target, Clock, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface BattleHistoryItem {
  id: string;
  opponentNickname: string;
  problemTitle: string;
  won: boolean;
  passedCases: string;
  totalTime: number;
  createdAt: string;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<BattleHistoryItem[]>([]);
  const [selectedBattle, setSelectedBattle] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('/api/battles/history');
        setHistory(res.data || []);
      } catch {
        setHistory([]);
      }
    };
    fetchHistory();
  }, []);

  if (!user) return null;

  const winData = [
    { name: '胜', value: user.wins },
    { name: '负', value: user.losses },
  ];
  const pieColors = ['#00ff88', '#ff6b6b'];
  const initial = user.nickname.charAt(0).toUpperCase();
  const totalGames = user.wins + user.losses;
  const winRate = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;

  const selected = history.find((h) => h.id === selectedBattle);

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="glass-strong p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-arena-accent/20 border-2 border-arena-accent/40 flex items-center justify-center font-display text-3xl font-bold text-arena-accent">
            {initial}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-white mb-1">{user.nickname}</h2>
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl font-bold text-arena-accent">
                {user.elo}
              </span>
              <span className="text-arena-muted text-sm">ELO</span>
              <RankBadge rank={user.rank} size="md" />
            </div>
          </div>
          <div className="w-28 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winData}
                  innerRadius={30}
                  outerRadius={45}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {winData.map((_, index) => (
                    <Cell key={index} fill={pieColors[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a2e',
                    border: '1px solid #2a2a4a',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 glass rounded-lg">
            <Trophy className="w-5 h-5 text-arena-success mx-auto mb-1" />
            <p className="text-arena-success font-semibold text-lg">{user.wins}</p>
            <p className="text-arena-muted text-xs">胜利</p>
          </div>
          <div className="text-center p-3 glass rounded-lg">
            <Target className="w-5 h-5 text-arena-danger mx-auto mb-1" />
            <p className="text-arena-danger font-semibold text-lg">{user.losses}</p>
            <p className="text-arena-muted text-xs">失败</p>
          </div>
          <div className="text-center p-3 glass rounded-lg">
            <Clock className="w-5 h-5 text-arena-accent mx-auto mb-1" />
            <p className="text-arena-accent font-semibold text-lg">{winRate}%</p>
            <p className="text-arena-muted text-xs">胜率</p>
          </div>
        </div>
      </div>

      <h3 className="font-display text-lg text-arena-accent mb-3 tracking-wider">
        对战记录
      </h3>

      {history.length === 0 ? (
        <div className="glass p-8 text-center text-arena-muted">
          暂无对战记录
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="glass p-4 cursor-pointer hover:border-arena-accent/30 transition-colors"
              onClick={() =>
                setSelectedBattle(selectedBattle === item.id ? null : item.id)
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      item.won
                        ? 'bg-arena-success/10 text-arena-success'
                        : 'bg-arena-danger/10 text-arena-danger'
                    }`}
                  >
                    {item.won ? '胜' : '负'}
                  </span>
                  <span className="text-white text-sm">{item.problemTitle}</span>
                  <span className="text-arena-muted text-xs">
                    vs {item.opponentNickname}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-arena-muted text-xs">{item.passedCases}</span>
                  <ChevronRight className="w-4 h-4 text-arena-muted" />
                </div>
              </div>

              {selectedBattle === item.id && selected && (
                <div className="mt-3 pt-3 border-t border-arena-border/30">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-arena-muted">对手:</span>{' '}
                      <span className="text-white">{selected.opponentNickname}</span>
                    </div>
                    <div>
                      <span className="text-arena-muted">用时:</span>{' '}
                      <span className="text-white">{selected.totalTime}s</span>
                    </div>
                    <div>
                      <span className="text-arena-muted">通过用例:</span>{' '}
                      <span className="text-arena-accent">{selected.passedCases}</span>
                    </div>
                    <div>
                      <span className="text-arena-muted">时间:</span>{' '}
                      <span className="text-white">
                        {new Date(selected.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
