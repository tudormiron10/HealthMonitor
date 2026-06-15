import { LandingHero } from './components/landing/LandingHero';
import { HowItWorks } from './components/landing/HowItWorks';
import { MLAccuracyTeaser } from './components/landing/MLAccuracyTeaser';
import { ClosingCTA } from './components/landing/ClosingCTA';

const LandingPage: React.FC = () => {
  return (
    <div className="w-full">
      <LandingHero />
      <HowItWorks />
      <MLAccuracyTeaser />
      <ClosingCTA />
    </div>
  );
};

export default LandingPage;
