import { render, screen } from '@testing-library/react';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

describe('ErrorMessage', () => {
  it('should render error message', () => {
    render(<ErrorMessage message="Test error message" />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should render dismiss button when onDismiss is provided', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage message="Test error" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole('button');
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton).toHaveTextContent('×');
  });

  it('should not render dismiss button when onDismiss is not provided', () => {
    render(<ErrorMessage message="Test error" />);
    
    const dismissButton = screen.queryByRole('button');
    expect(dismissButton).not.toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage message="Test error" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole('button');
    dismissButton.click();
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
