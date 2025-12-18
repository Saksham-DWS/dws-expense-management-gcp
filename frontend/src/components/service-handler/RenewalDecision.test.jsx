import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../common/Button', () => ({
  default: ({ children, ...props }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('lucide-react', () => ({
  CheckCircle: () => <span>check</span>,
  XCircle: () => <span>x</span>,
}));

import RenewalDecision from './RenewalDecision';

describe('RenewalDecision', () => {
  it('collects a reason and triggers confirm handler', async () => {
    const user = userEvent.setup();
    const onReasonChange = vi.fn();
    const onConfirm = vi.fn();
    const onReject = vi.fn();
    const onClose = vi.fn();

    render(
      <RenewalDecision
        reason=""
        onReasonChange={onReasonChange}
        onConfirm={onConfirm}
        onReject={onReject}
        onClose={onClose}
      />
    );

    const textarea = screen.getByPlaceholderText('Please provide a reason for your decision...');
    await user.type(textarea, 'Testing renewal');
    expect(onReasonChange).toHaveBeenCalled();

    const continueButton = screen.getByRole('button', { name: /Yes, Continue/i });
    await user.click(continueButton);
    expect(onConfirm).toHaveBeenCalled();

    const rejectButton = screen.getByRole('button', { name: /No, Cancel Service/i });
    await user.click(rejectButton);
    expect(onReject).toHaveBeenCalled();

    const cancelButton = screen.getByRole('button', { name: /Cancel$/i });
    await user.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });
});
