import { useEffect, useState } from 'react';

export function useScrollSpy(sectionIds: string[]): string {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? '');

  useEffect(() => {
    const onScroll = () => {
      // Threshold: 33% of viewport height — a section becomes "active" once its
      // top has crossed this line (scrolled above it), so the last such section wins.
      const threshold = window.innerHeight * 0.33;
      let active = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) {
          active = id;
        }
      }
      setActiveId(active);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set correct active section on mount (handles hash deep-links)
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return activeId;
}
