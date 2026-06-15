import { useEffect } from 'react';
import { PlatformHeader } from './components/platform/PlatformHeader';
import { PlatformConditions } from './components/platform/PlatformConditions';
import { PlatformMarkers } from './components/platform/PlatformMarkers';
import { PlatformSpecialists } from './components/platform/PlatformSpecialists';
import { PlatformTechnology } from './components/platform/PlatformTechnology';
import { PlatformSecurity } from './components/platform/PlatformSecurity';
import { PlatformMLAccuracy } from './components/platform/PlatformMLAccuracy';

export const PlatformPage: React.FC = () => {
  // Handle deep-links: /platform#security scrolls to the matching section on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* Section 1 — light */}
      <section id="header" className="scroll-mt-24 bg-secondary-soft/20">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <PlatformHeader />
        </div>
      </section>

      {/* Section 2 — light */}
      <section id="conditions" className="scroll-mt-24 bg-secondary-soft/20">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <PlatformConditions />
        </div>
      </section>

      {/* Section 3 — champagne */}
      <section id="markers" className="scroll-mt-24 bg-brand-light/50">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <PlatformMarkers />
        </div>
      </section>

      {/* Section 4 — light */}
      <section id="specialists" className="scroll-mt-24 bg-secondary-soft/20">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <PlatformSpecialists />
        </div>
      </section>

      {/* Section 5 — forest green (primary) */}
      <section id="technology" className="scroll-mt-24 bg-primary/95 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <PlatformTechnology />
        </div>
      </section>

      {/* Section 6 — oxblood (brand-dark) */}
      <section id="security" className="scroll-mt-24 bg-brand-dark/90 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <PlatformSecurity />
        </div>
      </section>

      {/* Section 7 — light */}
      <section id="ml-accuracy" className="scroll-mt-24 bg-secondary-soft/20">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <PlatformMLAccuracy />
        </div>
      </section>
    </div>
  );
};

export default PlatformPage;
