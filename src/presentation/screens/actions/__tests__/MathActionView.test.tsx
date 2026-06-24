import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { MathActionView } from '../MathActionView';
import { generateMath } from '@/domain/alarm/MathGenerator';

// NOTE: shake animation (className changes) is not covered — NativeWind classes are not
// observable in the RNTL environment.

jest.mock('@/domain/alarm/MathGenerator', () => ({
  generateMath: jest.fn(() => ({ question: '3 + 5', answer: 8 })),
}));

jest.mock('~/components/ui/text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

const mockGenerateMath = generateMath as jest.Mock;

describe('MathActionView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGenerateMath.mockReturnValue({ question: '3 + 5', answer: 8 });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders the question text returned by generateMath', async () => {
    const { getByText } = await render(
      <MathActionView level="EASY" onComplete={() => {}} />,
    );
    expect(getByText('3 + 5')).toBeTruthy();
  });

  it('calls onComplete when the correct answer is entered and Confirm is pressed', async () => {
    const onComplete = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <MathActionView level="EASY" onComplete={onComplete} />,
    );

    await fireEvent.changeText(getByPlaceholderText('?'), '8');
    await fireEvent.press(getByText('Confirm'));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete when the correct answer is submitted via onSubmitEditing', async () => {
    const onComplete = jest.fn();
    const { getByPlaceholderText } = await render(
      <MathActionView level="EASY" onComplete={onComplete} />,
    );

    await fireEvent.changeText(getByPlaceholderText('?'), '8');
    await fireEvent(getByPlaceholderText('?'), 'submitEditing');

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete when parseInt truncates trailing junk and the integer part matches', async () => {
    // "12abc" → parseInt → 12; mock answer = 12
    mockGenerateMath.mockReturnValue({ question: '6 + 6', answer: 12 });
    const onComplete = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <MathActionView level="MEDIUM" onComplete={onComplete} />,
    );

    await fireEvent.changeText(getByPlaceholderText('?'), '12abc');
    await fireEvent.press(getByText('Confirm'));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete when the answer has surrounding whitespace (trimmed before parse)', async () => {
    const onComplete = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <MathActionView level="EASY" onComplete={onComplete} />,
    );

    await fireEvent.changeText(getByPlaceholderText('?'), ' 8 ');
    await fireEvent.press(getByText('Confirm'));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onComplete when the answer field is empty', async () => {
    const onComplete = jest.fn();
    const { getByText } = await render(
      <MathActionView level="EASY" onComplete={onComplete} />,
    );

    // leave input empty
    await fireEvent.press(getByText('Confirm'));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does NOT call onComplete when the answer is non-numeric', async () => {
    const onComplete = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <MathActionView level="EASY" onComplete={onComplete} />,
    );

    await fireEvent.changeText(getByPlaceholderText('?'), 'abc');
    await fireEvent.press(getByText('Confirm'));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does NOT call onComplete for a wrong answer and clears the input after the shake timeout', async () => {
    const onComplete = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <MathActionView level="EASY" onComplete={onComplete} />,
    );

    await fireEvent.changeText(getByPlaceholderText('?'), '5');
    await fireEvent.press(getByText('Confirm'));

    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(getByPlaceholderText('?').props.value).toBe('');
  });

  it('calls onComplete when parseInt truncates decimal part and integer matches', async () => {
    // "8.5" → parseInt → 8; mock answer = 8 (default mock)
    const onComplete = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <MathActionView level="EASY" onComplete={onComplete} />,
    );

    await fireEvent.changeText(getByPlaceholderText('?'), '8.5');
    await fireEvent.press(getByText('Confirm'));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls generateMath with the level prop passed to the component', async () => {
    await render(<MathActionView level="HARD" onComplete={() => {}} />);

    expect(mockGenerateMath).toHaveBeenCalledWith('HARD');
  });
});
