import { render, screen } from '@testing-library/react';
import { HomeScreen } from './home-screen';

describe('HomeScreen', () => {
  it('renders the translated heading inside the main landmark', () => {
    render(<HomeScreen />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome to Midroc Learning' }),
    ).toBeInTheDocument();
  });
});
