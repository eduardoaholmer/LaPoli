import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLeaveWarning } from './leaveWarning';

const tryLeave = () => {
  const e = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(e);
  return e.defaultPrevented;
};

describe('useLeaveWarning', () => {
  it('só pergunta ao sair enquanto há algo não salvo', () => {
    const { rerender, unmount } = renderHook(({ on }) => useLeaveWarning(on), { initialProps: { on: false } });
    expect(tryLeave()).toBe(false);
    rerender({ on: true });
    expect(tryLeave()).toBe(true);
    rerender({ on: false });
    expect(tryLeave()).toBe(false);
    rerender({ on: true });
    unmount();
    expect(tryLeave()).toBe(false);
  });
});
