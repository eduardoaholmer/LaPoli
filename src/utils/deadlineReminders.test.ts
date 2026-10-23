import { afterEach, describe, expect, it, vi } from 'vitest';
import { askDeadlineReminders } from './deadlineReminders';

describe('askDeadlineReminders', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('pede permissão uma vez só, e só se ela ainda não respondeu', async () => {
    const requestPermission = vi.fn().mockResolvedValue('default');
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    await askDeadlineReminders();
    await askDeadlineReminders();
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('não pergunta de novo a quem já permitiu ou negou', async () => {
    const requestPermission = vi.fn();
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission });
    await askDeadlineReminders();
    expect(requestPermission).not.toHaveBeenCalled();
  });
});
