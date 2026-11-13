import { render, screen } from '@testing-library/react';
import { HomeScreen } from './home-screen';

describe('HomeScreen', () => {
  it('renders the translated page heading', () => {
    render(<HomeScreen />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome to Midroc Learning' }),
    ).toBeInTheDocument();
  });
});
