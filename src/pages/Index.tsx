import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { AboutSection } from '@/components/sections/AboutSection';
import { ObjectivesSection } from '@/components/sections/ObjectivesSection';
import { FeaturesSection } from '@/components/sections/FeaturesSection';
import { ModulesSection } from '@/components/sections/ModulesSection';
import { TechnologySection } from '@/components/sections/TechnologySection';
import { ResultsSection } from '@/components/sections/ResultsSection';
import { FutureScopeSection } from '@/components/sections/FutureScopeSection';
import { TeamSection } from '@/components/sections/TeamSection';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <ObjectivesSection />
        <FeaturesSection />
        <ModulesSection />
        <TechnologySection />
        <ResultsSection />
        <FutureScopeSection />
        <TeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
