import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';

export interface ProgressChartProps {
  buckets: { label: string; count: number }[];
  seriesLabel: string;
  formatCount: (count: number) => string;
}

/**
 * Learners by progress bucket (lazy-loaded with @mui/x-charts). Decorative for screen readers:
 * the screen shows the same numbers as a list.
 */
export default function ProgressChart({ buckets, seriesLabel, formatCount }: ProgressChartProps) {
  const theme = useTheme();
  const color = theme.vars?.palette.primary.main ?? theme.palette.primary.main;
  return (
    <div aria-hidden>
      <BarChart
        height={240}
        margin={{ left: 8, right: 16, top: 16, bottom: 8 }}
        xAxis={[{ scaleType: 'band', data: buckets.map((bucket) => bucket.label) }]}
        yAxis={[{ min: 0, tickMinStep: 1, valueFormatter: (value: number) => formatCount(value) }]}
        series={[
          {
            data: buckets.map((bucket) => bucket.count),
            label: seriesLabel,
            color,
            valueFormatter: (value) => (value === null ? '' : formatCount(value)),
          },
        ]}
        hideLegend
        grid={{ horizontal: true }}
      />
    </div>
  );
}
