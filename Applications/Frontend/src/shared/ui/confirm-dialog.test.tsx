import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';

function Harness({ onConfirm = () => undefined }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Delete a module
      </button>
      <ConfirmDialog
        open={open}
        tone="danger"
        title="Delete this module?"
        description="Its items are deleted too."
        confirmLabel="Delete module"
        onConfirm={onConfirm}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('a destructive dialog starts on Cancel, closes on Escape and returns focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Delete a module' });
    await user.click(opener);

    const dialog = await screen.findByRole('dialog', { name: 'Delete this module?' });
    expect(dialog).toHaveAccessibleDescription('Its items are deleted too.');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(opener).toHaveFocus();
  });

  it('keeps focus inside the dialog while it is open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Delete a module' }));
    const dialog = await screen.findByRole('dialog');
    for (let step = 0; step < 4; step += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('confirms with the confirm button', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Delete a module' }));
    await user.click(await screen.findByRole('button', { name: 'Delete module' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
