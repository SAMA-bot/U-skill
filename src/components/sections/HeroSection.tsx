import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, TrendingUp, Award, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  const scrollToSection = (id: string) => {
    const element = document.querySelector(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{ background: 'hsl(210 100% 60%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15"
          style={{ background: 'hsl(270 65% 62%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10"
          style={{ background: 'hsl(185 80% 55%)' }} />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(hsl(210 40% 96%) 1px, transparent 1px), linear-gradient(90deg, hsl(210 40% 96%) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      <div className="container-wide mx-auto px-4 md:px-8 pt-28 pb-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8 border border-primary/20 bg-primary/5 text-primary"
            >
              <Zap className="w-3.5 h-3.5" />
              Final Year Engineering Project 2025-26
            </motion.div>

            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-6 tracking-tight">
              Capacity Building &{' '}
              <span className="gradient-text">Faculty Upgradation</span>{' '}
              Tool
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
              An integrated web-based platform for performance assessment, skill gap identification, and motivation-driven development for academic faculty.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                variant="gradient"
                onClick={() => scrollToSection('#features')}
                className="group"
              >
                Explore Features
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToSection('#about')}
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-3 gap-8 mt-14 pt-8 border-t border-border/50"
            >
              {[
                { value: '30%', label: 'Engagement Boost' },
                { value: '4', label: 'Core Modules' },
                { value: '100%', label: 'Transparency' },
              ].map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="text-2xl md:text-3xl font-bold font-heading gradient-text">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Visual Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Main Card */}
              <div className="glass-card p-8 rounded-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                    backgroundImage: 'linear-gradient(135deg, hsl(210 100% 60% / 0.15), hsl(270 65% 62% / 0.15))',
                  }}>
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg">Performance Dashboard</h3>
                    <p className="text-sm text-muted-foreground">Real-time faculty analytics</p>
                  </div>
                </div>

                {/* Mock Chart */}
                <div className="space-y-5">
                  {[
                    { label: 'Teaching Excellence', value: 85, gradient: 'linear-gradient(90deg, hsl(210 100% 60%), hsl(185 80% 55%))' },
                    { label: 'Research Output', value: 72, gradient: 'linear-gradient(90deg, hsl(270 65% 62%), hsl(210 100% 60%))' },
                    { label: 'Administrative Skills', value: 90, gradient: 'linear-gradient(90deg, hsl(185 80% 55%), hsl(160 70% 45%))' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-foreground">{item.value}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ backgroundImage: item.gradient }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 glass-card p-4 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                    backgroundImage: 'linear-gradient(135deg, hsl(270 65% 62% / 0.2), hsl(290 60% 55% / 0.2))',
                  }}>
                    <Award className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Achievement</div>
                    <div className="text-xs text-muted-foreground">+15 badges earned</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-6 glass-card p-4 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                    backgroundImage: 'linear-gradient(135deg, hsl(210 100% 60% / 0.2), hsl(185 80% 55% / 0.2))',
                  }}>
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Training</div>
                    <div className="text-xs text-muted-foreground">3 courses recommended</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
