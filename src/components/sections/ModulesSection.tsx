import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Users, ClipboardCheck, GraduationCap, Trophy } from 'lucide-react';

const modules = [
  {
    icon: Users, number: '01', title: 'Faculty Module',
    description: 'Complete faculty profile management including personal details, qualifications, performance tracking, and individual scorecards.',
    features: ['Profile Management', 'Performance Tracking', 'Personal Scorecards', 'Document Upload'],
    gradient: 'linear-gradient(135deg, hsl(210 100% 60%), hsl(185 80% 55%))',
    glowColor: 'hsl(210 100% 60% / 0.1)',
  },
  {
    icon: ClipboardCheck, number: '02', title: 'Evaluation Module',
    description: 'Comprehensive KPI-based assessment system with analytics, benchmarking, and detailed performance reports.',
    features: ['KPI Assessment', 'Analytics Dashboard', 'Benchmarking', 'Report Generation'],
    gradient: 'linear-gradient(135deg, hsl(270 65% 62%), hsl(210 100% 60%))',
    glowColor: 'hsl(270 65% 62% / 0.1)',
  },
  {
    icon: GraduationCap, number: '03', title: 'Knowledge Module',
    description: 'Curated training programs, MOOC recommendations, certification tracking, and personalized learning paths.',
    features: ['Training Programs', 'MOOC Integration', 'Certifications', 'Learning Paths'],
    gradient: 'linear-gradient(135deg, hsl(185 80% 55%), hsl(160 70% 45%))',
    glowColor: 'hsl(185 80% 55% / 0.1)',
  },
  {
    icon: Trophy, number: '04', title: 'Motivation Module',
    description: 'Gamification elements including achievement badges, progress tracking, leaderboards, and performance insights.',
    features: ['Achievement Badges', 'Progress Tracking', 'Leaderboards', 'Performance Insights'],
    gradient: 'linear-gradient(135deg, hsl(270 65% 62%), hsl(290 60% 55%))',
    glowColor: 'hsl(270 65% 62% / 0.1)',
  },
];

export function ModulesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="modules" className="section-padding relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container-wide mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-xs uppercase tracking-[0.2em]">System Architecture</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6 tracking-tight">
            Core Modules
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Four interconnected modules working together to provide a comprehensive faculty development ecosystem.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {modules.map((module, index) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card-hover rounded-2xl overflow-hidden group relative"
            >
              {/* Top gradient bar */}
              <div className="h-1 w-full" style={{ backgroundImage: module.gradient }} />
              
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
                style={{ background: `radial-gradient(ellipse at top, ${module.glowColor}, transparent 70%)` }} />

              <div className="p-8 relative z-10">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                    backgroundImage: module.gradient,
                    opacity: 0.15,
                  }}>
                    <module.icon className="w-6 h-6 text-foreground" style={{ opacity: 1 }} />
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 absolute" style={{
                    background: 'transparent',
                  }}>
                    <module.icon className="w-6 h-6" style={{ color: 'hsl(210 40% 96%)' }} />
                  </div>
                  <div className="ml-16">
                    <span className="text-xs font-medium text-muted-foreground tracking-wider">MODULE {module.number}</span>
                    <h3 className="font-heading text-xl font-bold text-foreground">{module.title}</h3>
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">{module.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {module.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-secondary/80 text-secondary-foreground border border-border/50"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
