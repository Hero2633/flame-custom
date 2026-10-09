import { act, fireEvent, render, screen } from '@testing-library/react';
import { useFavicon } from './useFavicon';

const Probe = ({ url, enabled = true }: { url: string; enabled?: boolean }) => {
  const icon = useFavicon(url, enabled);
  return (
    <div>
      <span data-testid="status">{icon.imgLoaded ? 'loaded' : icon.imgFailed ? 'failed' : 'loading'}</span>
      {icon.faviconUrl && !icon.imgFailed && (
        <img alt="icon" key={icon.faviconUrl} src={icon.faviconUrl} onLoad={icon.onLoad} onError={icon.onError} />
      )}
    </div>
  );
};

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

test('retries only twice, then stops', () => {
  render(<Probe url="https://example.test/" />);
  fireEvent.error(screen.getByAltText('icon'));
  expect(screen.queryByAltText('icon')).toBeNull();
  act(() => { jest.advanceTimersByTime(20000); });
  expect(screen.getByAltText('icon').getAttribute('src')).toContain('attempt=1');
  fireEvent.error(screen.getByAltText('icon'));
  act(() => { jest.advanceTimersByTime(40000); });
  expect(screen.getByAltText('icon').getAttribute('src')).toContain('attempt=2');
  fireEvent.error(screen.getByAltText('icon'));
  act(() => { jest.advanceTimersByTime(120000); });
  expect(screen.queryByAltText('icon')).toBeNull();
});

test('URL change clears failure state and cancels the old retry', () => {
  const view = render(<Probe url="https://a.test/" />);
  fireEvent.error(screen.getByAltText('icon'));
  view.rerender(<Probe url="https://b.test/" />);
  expect(screen.getByAltText('icon').getAttribute('src')).toContain(encodeURIComponent('https://b.test/'));
  fireEvent.load(screen.getByAltText('icon'));
  act(() => { jest.advanceTimersByTime(20000); });
  expect(screen.getByTestId('status').textContent).toBe('loaded');
  expect(screen.getByAltText('icon').getAttribute('src')).toContain('attempt=0');
});

test('custom/unsupported icons do not trigger auto fetch; unmount clears timers', () => {
  const view = render(<Probe url="https://a.test/" enabled={false} />);
  expect(screen.queryByAltText('icon')).toBeNull();
  view.rerender(<Probe url="steam://game" />);
  expect(screen.queryByAltText('icon')).toBeNull();
  view.rerender(<Probe url="https://a.test/" />);
  const clear = jest.spyOn(window, 'clearTimeout');
  fireEvent.error(screen.getByAltText('icon'));
  view.unmount();
  expect(clear).toHaveBeenCalled();
});
