import ArrowDownwardOutlined from '@mui/icons-material/ArrowDownwardOutlined';
import ArrowUpwardOutlined from '@mui/icons-material/ArrowUpwardOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

/**
 * "Move up" / "Move down": the button alternative to dragging (WCAG 2.5.7), next to the
 * keyboard drag-and-drop in the tree. `position` is 0-based.
 */
export function MoveButtons({
  position,
  count,
  onMove,
  upLabel,
  downLabel,
}: {
  position: number;
  count: number;
  onMove: (to: number) => void;
  upLabel: string;
  downLabel: string;
}) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <Button
        startIcon={<ArrowUpwardOutlined />}
        disabled={position === 0}
        onClick={() => {
          onMove(position - 1);
        }}
      >
        {upLabel}
      </Button>
      <Button
        startIcon={<ArrowDownwardOutlined />}
        disabled={position >= count - 1}
        onClick={() => {
          onMove(position + 1);
        }}
      >
        {downLabel}
      </Button>
    </Stack>
  );
}
