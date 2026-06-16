interface BarChartProps {
  data: { date: string; count: number }[]
}

export default function BarChart({ data }: BarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  const getColor = (i: number) => {
    const r = Math.round(187 + (21 - 187) * (i / 6))
    const g = Math.round(222 + (101 - 222) * (i / 6))
    const b = Math.round(251 + (192 - 251) * (i / 6))
    return `rgb(${r}, ${g}, ${b})`
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-md">
      <h3 className="mb-4 text-base font-semibold text-[#333]">近7天预约趋势</h3>
      <div className="flex items-end justify-between gap-2" style={{ height: 260 }}>
        {data.map((item, i) => {
          const barHeight = (item.count / maxCount) * 200
          return (
            <div key={item.date} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-medium text-[#333]">{item.count}</span>
              <div
                className="w-full transition-all duration-300 ease-in-out"
                style={{
                  height: barHeight,
                  minHeight: 4,
                  backgroundColor: getColor(i),
                  borderRadius: '6px 6px 0 0',
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2">
        {data.map((item) => (
          <span key={item.date} className="flex-1 text-center text-xs text-[#666]">
            {item.date}
          </span>
        ))}
      </div>
    </div>
  )
}
