import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';

export interface ProgressChartProps {
  buckets: { label: string; count: number }[];
  seriesLabel: string;
  formatCount: (count: number) => string;
}

/**
 * Learners by progress bucket (lazy-loaded with @mui/x-charts), a labelled figure with the
 * chart's own keyboard navigation. The screen also lists the numbers as text.
 */
export default function ProgressChart({ buckets, seriesLabel, formatCount }: ProgressChartProps) {
  const theme = useTheme();
  const color = theme.vars?.palette.primary.main ?? theme.palette.primary.main;
  return (
    <figure aria-label={seriesLabel} style={{ margin: 0 }}>
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
    </figure>
  );
}
