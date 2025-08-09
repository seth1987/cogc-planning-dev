import { render, screen } from '@testing-library/react';
import App from '../src/App';

test('renders planning title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Planning COGC Paris Nord/i);
  expect(titleElement).toBeInTheDocument();
});

test('shows login form when not authenticated', () => {
  render(<App />);
  const emailInput = screen.getByLabelText(/Email/i);
  expect(emailInput).toBeInTheDocument();
});

test('shows password input in login form', () => {
  render(<App />);
  const passwordInput = screen.getByLabelText(/Mot de passe/i);
  expect(passwordInput).toBeInTheDocument();
});