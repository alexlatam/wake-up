import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ButtonActionView } from '../ButtonActionView';

jest.mock('~/components/ui/text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

// NOTE: No factory function needed — ButtonActionView accepts only onComplete callback.

describe('ButtonActionView', () => {
  it('renders "Turn off" text', async () => {
    const onComplete = jest.fn();
    await render(<ButtonActionView onComplete={onComplete} />);
    expect(screen.getByText('Turn off')).toBeTruthy();
  });

  it('calls onComplete when the button is pressed', async () => {
    const onComplete = jest.fn();
    await render(<ButtonActionView onComplete={onComplete} />);
    fireEvent.press(screen.getByText('Turn off'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onComplete before the button is pressed (initial state)', async () => {
    const onComplete = jest.fn();
    await render(<ButtonActionView onComplete={onComplete} />);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete on each press (no guard in source — multiple presses fire multiple times)', async () => {
    // NOTE: Source has no debounce or "already pressed" guard, so every press fires.
    const onComplete = jest.fn();
    await render(<ButtonActionView onComplete={onComplete} />);
    fireEvent.press(screen.getByText('Turn off'));
    fireEvent.press(screen.getByText('Turn off'));
    fireEvent.press(screen.getByText('Turn off'));
    expect(onComplete).toHaveBeenCalledTimes(3);
  });
});
