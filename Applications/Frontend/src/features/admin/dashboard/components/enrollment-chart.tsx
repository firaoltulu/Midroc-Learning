import { useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';

export interface EnrollmentChartProps {
  points: { date: string; count: number }[];
  label: string;
  formatLabel: (date: Date) => string;
  formatCount: (count: number) => string;
}

/**
 * Enrollments per day, week or month as bars (lazy-loaded with @mui/x-charts), a labelled
 * figure with the chart's own keyboard navigation. The dashboard also offers the numbers as a
 * table.
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
      <BarChart
        height={260}
        margin={{ left: 8, right: 8, top: 16, bottom: 8 }}
        xAxis={[
          {
            scaleType: 'band',
            data: points.map((point) => new Date(point.date)),
            valueFormatter: (value: Date) => formatLabel(value),
            categoryGapRatio: 0.25,
          },
        ]}
        yAxis={[{ min: 0, tickMinStep: 1, valueFormatter: (value: number) => formatCount(value) }]}
        series={[
          {
            data: points.map((point) => point.count),
            label,
            color,
            valueFormatter: (value) => (value === null ? '' : formatCount(value)),
          },
        ]}
        borderRadius={6}
        hideLegend
        grid={{ horizontal: true }}
      />
    </figure>
  );
}
