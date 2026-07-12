import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  const getMatch = () => (typeof window === 'undefined' || typeof window.matchMedia !== 'function' ? false : window.matchMedia(query).matches);
  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [query]);

  return matches;
}
