interface Props {
  value: number;
  label?: string;
  size?: number;
}

function colorFor(value: number): string {
  if (value >= 80) return "#22c55e";
  if (value >= 60) return "#84cc16";
  if (value >= 40) return "#f59e0b";
  return "#ef4444";
}

export function ScoreGauge({ value, label, size = 120 }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = colorFor(clamped);
  const style = {
    "--val": clamped,
    "--c": color,
    width: size,
    height: size,
  } as React.CSSProperties;

  return (
    <div className="stack" style={{ alignItems: "center", textAlign: "center" }}>
      <div className="gauge" style={style}>
        <div className="gauge-text" style={{ color }}>
          {Math.round(clamped)}
        </div>
      </div>
      {label && <div className="muted" style={{ fontSize: 12.5 }}>{label}</div>}
    </div>
  );
}
