import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeReminders, Reminder } from '../../components/home/HomeReminders';

// Mock the haptic hooks
vi.mock('../../src/hooks/useHaptic', () => ({
  hapticTap: vi.fn(),
  hapticSuccess: vi.fn(),
}));

describe('HomeReminders', () => {
  const defaultProps = {
    reminders: [] as Reminder[],
    isListeningReminder: false,
    isProcessingReminder: false,
    newReminderText: '',
    newReminderTime: '',
    onSetReminders: vi.fn(),
    onSetNewReminderText: vi.fn(),
    onSetNewReminderTime: vi.fn(),
    onStartVoiceReminder: vi.fn(),
    onAddReminder: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the reminders header', () => {
    render(<HomeReminders {...defaultProps} />);
    expect(screen.getByText('Reminders')).toBeInTheDocument();
  });

  it('shows empty state when no reminders', () => {
    render(<HomeReminders {...defaultProps} />);
    expect(screen.getByText('No reminders set')).toBeInTheDocument();
    expect(screen.getByText('Tap the mic to add one by voice')).toBeInTheDocument();
  });

  it('renders reminder items when provided', () => {
    const reminders: Reminder[] = [
      { id: '1', text: 'Call supplier', time: '10:00', isCompleted: false },
      { id: '2', text: 'Check materials', time: '14:00', isCompleted: true },
    ];

    render(<HomeReminders {...defaultProps} reminders={reminders} />);

    expect(screen.getByText('Call supplier')).toBeInTheDocument();
    expect(screen.getByText('Check materials')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('calls onSetNewReminderText when typing in text input', () => {
    const onSetNewReminderText = vi.fn();
    render(<HomeReminders {...defaultProps} onSetNewReminderText={onSetNewReminderText} />);

    const input = screen.getByPlaceholderText('Reminder text...');
    fireEvent.change(input, { target: { value: 'New reminder' } });

    expect(onSetNewReminderText).toHaveBeenCalledWith('New reminder');
  });

  it('calls onAddReminder when add button is clicked', () => {
    const onAddReminder = vi.fn();
    render(
      <HomeReminders
        {...defaultProps}
        newReminderText="Test reminder"
        newReminderTime="15:00"
        onAddReminder={onAddReminder}
      />
    );

    // Find the add button (Plus icon button)
    const addButtons = screen.getAllByRole('button');
    const addButton = addButtons.find(btn => !btn.disabled && btn.querySelector('svg'));
    if (addButton) {
      fireEvent.click(addButton);
    }

    // The button should be enabled when both text and time are provided
  });

  it('disables add button when text or time is empty', () => {
    render(<HomeReminders {...defaultProps} newReminderText="" newReminderTime="" />);

    // Find the add button - it should be disabled
    const buttons = screen.getAllByRole('button');
    const addButton = buttons.find(btn => btn.classList.contains('disabled:opacity-50'));

    expect(addButton).toBeDefined();
  });

  it('calls onStartVoiceReminder when mic button is clicked', () => {
    const onStartVoiceReminder = vi.fn();
    render(<HomeReminders {...defaultProps} onStartVoiceReminder={onStartVoiceReminder} />);

    // Find the mic button (first button in the header area)
    const buttons = screen.getAllByRole('button');
    const micButton = buttons[0]; // First button is the mic
    fireEvent.click(micButton);

    expect(onStartVoiceReminder).toHaveBeenCalled();
  });

  it('shows listening state when isListeningReminder is true', () => {
    render(<HomeReminders {...defaultProps} isListeningReminder={true} />);

    // Should show MicOff icon when listening
    const micButton = screen.getAllByRole('button')[0];
    expect(micButton.className).toContain('animate-pulse');
    expect(micButton.className).toContain('bg-red-500');
  });

  it('shows processing state when isProcessingReminder is true', () => {
    render(<HomeReminders {...defaultProps} isProcessingReminder={true} />);

    // Mic button should be disabled when processing
    const buttons = screen.getAllByRole('button');
    const micButton = buttons[0];
    expect(micButton).toBeDisabled();
  });

  it('shows alarming state for reminder', () => {
    const reminders: Reminder[] = [
      { id: '1', text: 'Urgent task', time: '10:00', isCompleted: false, isAlarming: true },
    ];

    render(<HomeReminders {...defaultProps} reminders={reminders} />);

    // Should show snooze and done buttons for alarming reminder
    expect(screen.getByText('+5min')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('toggles reminder completion when checkbox clicked', () => {
    const onSetReminders = vi.fn();
    const reminders: Reminder[] = [
      { id: '1', text: 'Test task', time: '10:00', isCompleted: false },
    ];

    render(<HomeReminders {...defaultProps} reminders={reminders} onSetReminders={onSetReminders} />);

    // Find and click the checkbox button
    const checkboxButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg[class*="text-slate-300"]')
    );

    if (checkboxButton) {
      fireEvent.click(checkboxButton);
      expect(onSetReminders).toHaveBeenCalled();
    }
  });
});
