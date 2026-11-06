export function ProgressBar({
  ratio,
  color = "#34d399",
}: {
  ratio: number;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#0a1119]">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.max(clamped * 100, ratio > 0 ? 3 : 0)}%`,
          backgroundColor: ratio > 1 ? "#f87171" : color,
        }}
      />
    </div>
  );
}
