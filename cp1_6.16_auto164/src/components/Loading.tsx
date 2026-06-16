interface LoadingProps {
  text?: string
}

export default function Loading({ text = '加载中...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="loading-spinner" />
      {text && <span className="text-sm text-[#666]">{text}</span>}
    </div>
  )
}
