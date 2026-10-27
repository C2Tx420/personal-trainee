import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const axis = { stroke: 'var(--muted)', fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltip = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12, color: 'var(--fg)' },
  labelStyle: { color: 'var(--muted)' },
};

export type Point = { label: string } & Record<string, number | null | string>;

export function SimpleLine({
  data,
  lines,
  height = 200,
  refY,
  domain,
  unit,
}: {
  data: Point[];
  lines: { key: string; name: string; color?: string; dashed?: boolean }[];
  height?: number;
  refY?: { y: number; label: string }[];
  domain?: [number | 'auto', number | 'auto'];
  unit?: string;
}) {
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} width={36} domain={domain ?? ['auto', 'auto']} unit={unit} />
          <Tooltip {...tooltip} />
          {refY?.map((r) => (
            <ReferenceLine key={r.label} y={r.y} stroke="var(--ok)" strokeDasharray="4 4" label={{ value: r.label, fill: 'var(--ok)', fontSize: 10, position: 'insideTopRight' }} />
          ))}
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name}
              stroke={l.color ?? 'var(--accent)'}
              strokeWidth={2}
              strokeDasharray={l.dashed ? '5 4' : undefined}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleBars({ data, dataKey, name, height = 180, unit }: { data: Point[]; dataKey: string; name: string; height?: number; unit?: string }) {
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} width={40} unit={unit} />
          <Tooltip {...tooltip} cursor={{ fill: 'var(--card-2)' }} />
          <Bar dataKey={dataKey} name={name} fill="var(--accent)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
