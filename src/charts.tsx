type TrendPoint = {
  month: string;
  finished: number;
  started: number;
};

type PiePoint = {
  name: string;
  value: number;
};

type BarPoint = {
  name: string;
  total: number;
};

const defaultPieColors = ["#f4ef1b", "#26d8ff", "#ff57c9", "#ff8e2b", "#8c64ff"];

function buildLabelStep(width: number, count: number, minSlotWidth: number): number {
  if (count <= 1) return 1;
  return Math.max(1, Math.ceil((count * minSlotWidth) / Math.max(width, 1)));
}

function formatTick(value: number): string {
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) < 1) {
    return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }
  return value.toFixed(1).replace(/\.0$/, "");
}

function getNiceStep(maxValue: number, tickCount: number): number {
  if (maxValue <= 1) return 0.25;

  const roughStep = maxValue / Math.max(1, tickCount - 1);
  const exponent = Math.floor(Math.log10(roughStep));
  const magnitude = 10 ** exponent;
  const residual = roughStep / magnitude;

  if (residual <= 1) return magnitude;
  if (residual <= 2) return 2 * magnitude;
  if (residual <= 2.5) return 2.5 * magnitude;
  if (residual <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function buildTicks(maxValue: number, tickCount: number): number[] {
  const step = getNiceStep(Math.max(0, maxValue), tickCount);
  const ceiling = Math.max(step * (tickCount - 1), Math.ceil(maxValue / step) * step);
  return Array.from({ length: tickCount }, (_, index) => Number((index * step).toFixed(4))).filter(
    (value) => value <= ceiling + 0.0001,
  );
}

function buildLinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function buildArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArcFlag} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
  ].join(" ");
}

function buildDonutSegments(params: {
  data: PiePoint[];
  total: number;
  centerX: number;
  centerY: number;
  radius: number;
  colors: string[];
}) {
  const { data, total, centerX, centerY, radius, colors } = params;
  const segments: Array<{ name: string; path: string; color: string }> = [];
  if (data.length === 1) {
    segments.push({
      name: data[0]?.name ?? "segment",
      path: "",
      color: colors[0] ?? defaultPieColors[0],
    });
    return segments;
  }
  let cursor = 0;

  for (const [index, entry] of data.entries()) {
    const sweep = (entry.value / total) * 360;
    const gap = Math.min(3, sweep * 0.08);
    const path = buildArcPath(centerX, centerY, radius, cursor + gap / 2, cursor + sweep - gap / 2);
    segments.push({
      name: entry.name,
      path,
      color: colors[index % colors.length],
    });
    cursor += sweep;
  }

  return segments;
}

export function TrendLineChart({
  width,
  height,
  data,
}: {
  width: number;
  height: number;
  data: TrendPoint[];
}) {
  const margins = { top: 18, right: 14, bottom: 34, left: 38 };
  const innerWidth = Math.max(1, width - margins.left - margins.right);
  const innerHeight = Math.max(1, height - margins.top - margins.bottom);
  const maxValue = Math.max(
    1,
    ...data.flatMap((entry) => [entry.finished, entry.started]).filter((value) => Number.isFinite(value)),
  );
  const ticks = buildTicks(maxValue, 5);
  const scaleMax = ticks[ticks.length - 1] || 1;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : innerWidth;
  const labelStep = buildLabelStep(innerWidth, data.length, 54);
  const toY = (value: number) => margins.top + innerHeight - (value / scaleMax) * innerHeight;
  const toX = (index: number) =>
    data.length <= 1 ? margins.left + innerWidth / 2 : margins.left + stepX * index;
  const finishedPoints = data.map((entry, index) => ({ x: toX(index), y: toY(entry.finished), value: entry.finished }));
  const startedPoints = data.map((entry, index) => ({ x: toX(index), y: toY(entry.started), value: entry.started }));

  return (
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} aria-label="Evolução do ano">
      {ticks.map((tick) => {
        const y = toY(tick);
        return (
          <g key={tick}>
            <line
              className="chart-svg__grid"
              x1={margins.left}
              y1={y}
              x2={width - margins.right}
              y2={y}
            />
            <text className="chart-svg__label" x={margins.left - 10} y={y + 4} textAnchor="end">
              {formatTick(tick)}
            </text>
          </g>
        );
      })}

      {data.map((entry, index) =>
        index % labelStep === 0 || index === data.length - 1 ? (
          <text
            key={entry.month}
            className="chart-svg__label"
            x={toX(index)}
            y={height - 8}
            textAnchor="middle"
          >
            {entry.month}
          </text>
        ) : null,
      )}

      <path className="chart-svg__line chart-svg__line--yellow" d={buildLinePath(finishedPoints)} />
      <path className="chart-svg__line chart-svg__line--cyan" d={buildLinePath(startedPoints)} />

      {finishedPoints.map((point, index) => (
        <circle
          key={`finished-${data[index]?.month ?? index}`}
          className="chart-svg__dot chart-svg__dot--yellow"
          cx={point.x}
          cy={point.y}
          r={4.5}
        />
      ))}

      {startedPoints.map((point, index) => (
        <circle
          key={`started-${data[index]?.month ?? index}`}
          className="chart-svg__dot chart-svg__dot--cyan"
          cx={point.x}
          cy={point.y}
          r={4.5}
        />
      ))}
    </svg>
  );
}

export function DonutChart({
  width,
  height,
  data,
  colors = defaultPieColors,
}: {
  width: number;
  height: number;
  data: PiePoint[];
  colors?: string[];
}) {
  const total = Math.max(1, data.reduce((sum, entry) => sum + entry.value, 0));
  const strokeWidth = Math.max(18, Math.min(width, height) * 0.12);
  const radius = Math.max(24, Math.min(width, height) / 2 - strokeWidth);
  const centerX = width / 2;
  const centerY = height / 2;
  const segments = buildDonutSegments({
    data,
    total,
    centerX,
    centerY,
    radius,
    colors,
  });

  return (
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} aria-label="Distribuição por plataformas">
      <circle
        className="chart-svg__arc-track"
        cx={centerX}
        cy={centerY}
        r={radius}
        strokeWidth={strokeWidth}
      />

      {segments.map((segment) =>
        segment.path ? (
          <path
            key={segment.name}
            d={segment.path}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
        ) : (
          <circle
            key={segment.name}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
          />
        ),
      )}
    </svg>
  );
}

export function VerticalBarChart({
  width,
  height,
  data,
  color = "#f4ef1b",
}: {
  width: number;
  height: number;
  data: BarPoint[];
  color?: string;
}) {
  const margins = { top: 14, right: 12, bottom: 40, left: 42 };
  const innerWidth = Math.max(1, width - margins.left - margins.right);
  const innerHeight = Math.max(1, height - margins.top - margins.bottom);
  const maxValue = Math.max(1, ...data.map((entry) => entry.total));
  const ticks = buildTicks(maxValue, 5);
  const scaleMax = ticks[ticks.length - 1] || 1;
  const slotWidth = innerWidth / Math.max(1, data.length);
  const barWidth = Math.min(92, Math.max(18, slotWidth * 0.62));
  const labelStep = buildLabelStep(innerWidth, data.length, 64);
  const toY = (value: number) => margins.top + innerHeight - (value / scaleMax) * innerHeight;

  return (
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} aria-label="Backlog por duração">
      {ticks.map((tick) => {
        const y = toY(tick);
        return (
          <g key={tick}>
            <line
              className="chart-svg__grid"
              x1={margins.left}
              y1={y}
              x2={width - margins.right}
              y2={y}
            />
            <text className="chart-svg__label" x={margins.left - 10} y={y + 4} textAnchor="end">
              {formatTick(tick)}
            </text>
          </g>
        );
      })}

      {data.map((entry, index) => {
        const x = margins.left + slotWidth * index + (slotWidth - barWidth) / 2;
        const y = toY(entry.total);
        const barHeight = margins.top + innerHeight - y;
        return (
          <g key={entry.name}>
            <rect
              className="chart-svg__bar"
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(0, barHeight)}
              fill={color}
            />
            {index % labelStep === 0 || index === data.length - 1 ? (
              <text
                className="chart-svg__label"
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
              >
                {entry.name}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
