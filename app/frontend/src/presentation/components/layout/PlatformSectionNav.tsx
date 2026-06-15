import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollSpy } from '@/application/hooks/useScrollSpy';

export const SECTION_IDS = [
  'header',
  'conditions',
  'markers',
  'specialists',
  'technology',
  'security',
  'ml-accuracy',
] as const;

export const SIDEBAR_KEYS: Record<string, string> = {
  'header': 'platform.sidebar.header',
  'conditions': 'platform.sidebar.conditions',
  'markers': 'platform.sidebar.markers',
  'specialists': 'platform.sidebar.specialists',
  'technology': 'platform.sidebar.technology',
  'security': 'platform.sidebar.security',
  'ml-accuracy': 'platform.sidebar.mlAccuracy',
};

export const PlatformSectionNav: React.FC = () => {
  const { t } = useTranslation();
  const activeId = useScrollSpy([...SECTION_IDS]);

  const navItemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const activeIdRef = useRef(activeId);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const measureIndicator = useCallback(() => {
    const el = navItemRefs.current[activeIdRef.current];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, []);

  // Slide the bar under the active item; recompute on section/language change
  useEffect(() => {
    activeIdRef.current = activeId;
    measureIndicator();
  }, [activeId, t, measureIndicator]);

  // Keep the bar aligned on resize and once web fonts finish loading
  useEffect(() => {
    window.addEventListener('resize', measureIndicator);
    document.fonts?.ready.then(measureIndicator);
    return () => window.removeEventListener('resize', measureIndicator);
  }, [measureIndicator]);

  return (
    <ul className="relative flex items-center justify-center gap-1 overflow-x-auto scrollbar-hide">
      {SECTION_IDS.map((id) => (
        <li
          key={id}
          ref={(el) => { navItemRefs.current[id] = el; }}
          className="shrink-0"
        >
          <a
            href={`#${id}`}
            className={`block px-3 py-1.5 text-xs font-heading tracking-[0.12em] uppercase whitespace-nowrap transition-colors duration-200 ${
              activeId === id
                ? 'text-primary font-bold'
                : 'text-brand-dark/40 hover:text-brand-dark'
            }`}
          >
            {t(SIDEBAR_KEYS[id])}
          </a>
        </li>
      ))}
      {/* Sliding active indicator */}
      <span
        className="absolute bottom-0 h-0.75 bg-primary rounded-full transition-all duration-300 ease-out pointer-events-none"
        style={{ left: indicator.left, width: indicator.width }}
      />
    </ul>
  );
};
