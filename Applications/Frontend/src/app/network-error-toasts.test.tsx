import { useMutation, useQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { apiRequest } from '../shared/api/client';
import { api, server } from '../test/msw';
import { renderWithProviders } from '../test/render';

const NETWORK_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

function EnrollButton({ toast = true }: { toast?: boolean }) {
  const enroll = useMutation({
    mutationFn: () => apiRequest('/courses/c1/enroll', { method: 'POST' }),
    meta: { networkErrorToast: toast },
  });
  return (
    <>
      <button
        type="button"
        onClick={() => {
          enroll.mutate();
        }}
      >
        Enroll
      </button>
      {enroll.isSuccess ? <p>Enrolled</p> : null}
    </>
  );
}

/** Fails with a network error `failures` times, then succeeds. */
function flakyEnroll(failures: number) {
  let calls = 0;
  server.use(
    http.post(api('/courses/c1/enroll'), () => {
      calls += 1;
      return calls <= failures ? HttpResponse.error() : HttpResponse.json({}, { status: 201 });
    }),
  );
  return () => calls;
}

describe('network failure toasts', () => {
  it('a mutation that never reached the server offers "Try again", which re-sends it', async () => {
    const calls = flakyEnroll(1);
    const { user } = await renderWithProviders(<EnrollButton />);

    await user.click(screen.getByRole('button', { name: 'Enroll' }));
    // Visible in the toast and announced through the assertive live region.
    expect(await screen.findAllByText(NETWORK_MESSAGE)).not.toHaveLength(0);
    expect(document.querySelector('[aria-live="assertive"]')).toHaveTextContent(NETWORK_MESSAGE);

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Enrolled')).toBeInTheDocument();
    expect(calls()).toBe(2);
  });

  it('a screen can opt out and show the failure itself', async () => {
    flakyEnroll(1);
    const { user } = await renderWithProviders(<EnrollButton toast={false} />);
    await user.click(screen.getByRole('button', { name: 'Enroll' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(NETWORK_MESSAGE)).not.toBeInTheDocument();
  });

  it('a query with nothing on screen yet gets no toast (its error state shows instead)', async () => {
    server.use(http.get(api('/courses'), () => HttpResponse.error()));
    function Catalog() {
      const courses = useQuery({ queryKey: ['courses'], queryFn: () => apiRequest('/courses') });
      return courses.isError ? <p>Error state</p> : null;
    }
    await renderWithProviders(<Catalog />);
    expect(await screen.findByText('Error state')).toBeInTheDocument();
    expect(screen.queryByText(NETWORK_MESSAGE)).not.toBeInTheDocument();
  });
});
