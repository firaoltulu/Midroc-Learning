import { LineChart } from '@mui/x-charts/LineChart';
import { useTheme } from '@mui/material/styles';

export interface EnrollmentChartProps {
  points: { date: string; count: number }[];
  label: string;
  formatLabel: (date: Date) => string;
  formatCount: (count: number) => string;
}

/**
 * The enrollment time series (lazy-loaded with @mui/x-charts). Decorative for screen readers:
 * the dashboard offers the same numbers as a table.
 */
export default function EnrollmentChart({
  points,
  label,
  formatLabel,
  formatCount,
}: EnrollmentChartProps) {
  const theme = useTheme();
  const color = theme.vars?.palette.primary.main ?? theme.palette.primary.main;
  return (
    <div aria-hidden>
      <LineChart
        height={280}
        margin={{ left: 8, right: 16, top: 16, bottom: 8 }}
        xAxis={[
          {
            scaleType: 'point',
            data: points.map((point) => new Date(point.date)),
            valueFormatter: (value: Date) => formatLabel(value),
          },
        ]}
        yAxis={[{ min: 0, tickMinStep: 1, valueFormatter: (value: number) => formatCount(value) }]}
        series={[
          {
            data: points.map((point) => point.count),
            label,
            color,
            showMark: points.length <= 31,
            valueFormatter: (value) => (value === null ? '' : formatCount(value)),
          },
        ]}
        hideLegend
        grid={{ horizontal: true }}
      />
    </div>
  );
}
