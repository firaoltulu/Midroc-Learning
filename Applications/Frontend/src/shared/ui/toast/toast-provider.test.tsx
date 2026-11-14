import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, type ToastSeverity } from './toast-context';
import { ToastProvider } from './toast-provider';

function ShowToast({ message, severity }: { message: string; severity: ToastSeverity }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        toast.show({ message, severity });
      }}
    >
      Show a toast
    </button>
  );
}

describe('ToastProvider', () => {
  it('announces success politely and shows the toast', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ShowToast message="Changes saved" severity="success" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Show a toast' }));
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Changes saved');
    expect(document.querySelector('[aria-live="assertive"]')).toHaveTextContent('');
    expect(await screen.findAllByText('Changes saved')).toHaveLength(2);
  });

  it('announces errors assertively', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ShowToast message="Couldn't save" severity="error" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Show a toast' }));
    expect(document.querySelector('[aria-live="assertive"]')).toHaveTextContent("Couldn't save");
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('');
  });
});
