import { useEffect, useState } from 'react';

const RETRY_DELAYS = [20000, 40000];
interface ImageState {
  key: string;
  attempt: number;
  loaded: boolean;
  failed: boolean;
}

export const useFavicon = (url: string, enabled: boolean) => {
  let key = '';
  try {
    const parsed = new URL(url);
    if (enabled && ['http:', 'https:'].includes(parsed.protocol)) {
      key = `/api/favicon?v=2&url=${encodeURIComponent(url)}`;
    }
  } catch {}
  const initial: ImageState = { key, attempt: 0, loaded: false, failed: false };
  const [stored, setStored] = useState<ImageState>(initial);
  const state = stored.key === key ? stored : initial;
  // Reset during render so the new URL cannot inherit a previous image's error.
  if (stored.key !== key) setStored(initial);

  useEffect(() => {
    if (!key || !state.failed || state.attempt >= RETRY_DELAYS.length) return;
    const timer = window.setTimeout(() => {
      setStored((previous) => previous.key !== key ? previous : {
        ...previous, attempt: previous.attempt + 1, failed: false, loaded: false,
      });
    }, RETRY_DELAYS[state.attempt]);
    return () => window.clearTimeout(timer);
  }, [key, state.failed, state.attempt]);

  const update = (loaded: boolean) => setStored((previous) =>
    previous.key !== key || previous.attempt !== state.attempt ? previous : {
      ...previous, loaded, failed: !loaded,
    });
  return {
    faviconUrl: key ? `${key}&attempt=${state.attempt}` : '',
    imgLoaded: state.loaded,
    imgFailed: state.failed,
    onLoad: () => update(true),
    onError: () => update(false),
  };
};
