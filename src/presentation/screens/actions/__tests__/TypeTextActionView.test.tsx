import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { TypeTextActionView } from '../TypeTextActionView';
import { getRandomPhrase, getCustomPhrase } from '@/domain/alarm/TextPhrases';

// NOTE: shake animation (backgroundColor changes) is not observable in the RNTL environment;
// we only verify the functional side-effects (input cleared, onComplete not called).

const MOCK_PHRASE = 'The sun is shining today.';

jest.mock('@/domain/alarm/TextPhrases', () => ({
  getRandomPhrase: jest.fn(() => MOCK_PHRASE),
  getCustomPhrase: jest.fn(() => MOCK_PHRASE),
}));

jest.mock('~/components/ui/text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

const mockGetRandomPhrase = getRandomPhrase as jest.Mock;
const mockGetCustomPhrase = getCustomPhrase as jest.Mock;

describe('TypeTextActionView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetRandomPhrase.mockReturnValue(MOCK_PHRASE);
    mockGetCustomPhrase.mockReturnValue(MOCK_PHRASE);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders the phrase text', async () => {
    const { getAllByText } = await render(
      <TypeTextActionView level="EASY" onComplete={jest.fn()} />,
    );
    const nodes = getAllByText(MOCK_PHRASE);
    expect(nodes.length).toBeGreaterThan(0);
  });

  it('calls onComplete when exact phrase is typed and submitted via button', async () => {
    const onComplete = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <TypeTextActionView level="EASY" onComplete={onComplete} />,
    );
    await fireEvent.changeText(getByPlaceholderText('Type here…'), MOCK_PHRASE);
    await fireEvent.press(getByText('Confirm'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete when phrase with leading/trailing spaces is trimmed to exact match', async () => {
    const onComplete = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <TypeTextActionView level="EASY" onComplete={onComplete} />,
    );
    await fireEvent.changeText(getByPlaceholderText('Type here…'), ` ${MOCK_PHRASE} `);
    await fireEvent.press(getByText('Confirm'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onComplete for case-insensitive match (exact match required)', async () => {
    const onComplete = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <TypeTextActionView level="EASY" onComplete={onComplete} />,
    );
    // lowercase first letter — 'the sun is shining today.' vs 'The sun is shining today.'
    await fireEvent.changeText(getByPlaceholderText('Type here…'), MOCK_PHRASE.toLowerCase());
    await fireEvent.press(getByText('Confirm'));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does NOT call onComplete when punctuation is missing', async () => {
    const onComplete = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <TypeTextActionView level="EASY" onComplete={onComplete} />,
    );
    // Strip trailing period
    const withoutPeriod = MOCK_PHRASE.slice(0, -1);
    await fireEvent.changeText(getByPlaceholderText('Type here…'), withoutPeriod);
    await fireEvent.press(getByText('Confirm'));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does NOT call onComplete for empty input', async () => {
    const onComplete = jest.fn();
    const { getByText } = await render(
      <TypeTextActionView level="EASY" onComplete={onComplete} />,
    );
    // Input starts empty — press Confirm without typing anything
    await fireEvent.press(getByText('Confirm'));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does NOT call onComplete for wrong text and clears input after 600ms', async () => {
    const onComplete = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <TypeTextActionView level="EASY" onComplete={onComplete} />,
    );
    const input = getByPlaceholderText('Type here…');
    await fireEvent.changeText(input, 'wrong phrase here');
    await fireEvent.press(getByText('Confirm'));

    expect(onComplete).not.toHaveBeenCalled();
    // Input should be cleared immediately on wrong submission
    expect(input.props.value).toBe('');

    // After 600ms the shake state resets (no observable side-effect in unit tests,
    // but the timer must resolve without error)
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls getRandomPhrase with the correct level for EASY', async () => {
    await render(<TypeTextActionView level="EASY" onComplete={jest.fn()} />);
    expect(mockGetRandomPhrase).toHaveBeenCalledWith('EASY');
    expect(mockGetCustomPhrase).not.toHaveBeenCalled();
  });

  it('calls getCustomPhrase with customWordCount when level is CUSTOM', async () => {
    await render(
      <TypeTextActionView level="CUSTOM" customWordCount={20} onComplete={jest.fn()} />,
    );
    expect(mockGetCustomPhrase).toHaveBeenCalledWith(20);
    expect(mockGetRandomPhrase).not.toHaveBeenCalled();
  });

  it('calls getCustomPhrase with default 15 when level is CUSTOM and customWordCount is omitted', async () => {
    await render(<TypeTextActionView level="CUSTOM" onComplete={jest.fn()} />);
    expect(mockGetCustomPhrase).toHaveBeenCalledWith(15);
    expect(mockGetRandomPhrase).not.toHaveBeenCalled();
  });

  it('calls onComplete when exact phrase is submitted via onSubmitEditing (keyboard done)', async () => {
    const onComplete = jest.fn();
    const { getByPlaceholderText } = await render(
      <TypeTextActionView level="EASY" onComplete={onComplete} />,
    );
    const input = getByPlaceholderText('Type here…');
    await fireEvent.changeText(input, MOCK_PHRASE);
    await fireEvent(input, 'submitEditing');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
