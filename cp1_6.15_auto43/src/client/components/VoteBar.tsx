interface VoteBarProps {
  votesFor: number;
  votesAgainst: number;
}

export default function VoteBar({ votesFor, votesAgainst }: VoteBarProps) {
  const total = votesFor + votesAgainst;
  const forPercent = total === 0 ? 50 : (votesFor / total) * 100;
  const againstPercent = total === 0 ? 50 : (votesAgainst / total) * 100;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#a0aec0' }}>
        <span>总投票 {total}</span>
        <span>投票人数</span>
      </div>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
        <div
          style={{
            width: `${forPercent}%`,
            background: '#48bb78',
            transition: 'width 0.3s ease',
            borderRadius: forPercent === 100 ? 4 : '4px 0 0 4px',
            minWidth: total > 0 ? 2 : 0,
          }}
        />
        <div
          style={{
            width: `${againstPercent}%`,
            background: '#f56565',
            transition: 'width 0.3s ease',
            borderRadius: againstPercent === 100 ? 4 : '0 4px 4px 0',
            minWidth: total > 0 ? 2 : 0,
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11 }}>
        <span style={{ color: '#48bb78', fontWeight: 600 }}>
          赞成 {votesFor}{total > 0 ? ` (${Math.round(forPercent)}%)` : ''}
        </span>
        <span style={{ color: '#f56565', fontWeight: 600 }}>
          反对 {votesAgainst}{total > 0 ? ` (${Math.round(againstPercent)}%)` : ''}
        </span>
      </div>
    </div>
  );
}
