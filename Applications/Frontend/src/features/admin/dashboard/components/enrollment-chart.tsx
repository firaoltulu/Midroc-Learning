import { LineChart } from '@mui/x-charts/LineChart';
import { useTheme } from '@mui/material/styles';

export interface EnrollmentChartProps {
  points: { date: string; count: number }[];
  label: string;
  formatLabel: (date: Date) => string;
  formatCount: (count: number) => string;
}

/**
 * The enrollment time series (lazy-loaded with @mui/x-charts), a labelled figure with the
 * chart's own keyboard navigation. The dashboard also offers the numbers as a table.
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
    <figure aria-label={label} style={{ margin: 0 }}>
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
    </figure>
  );
}
