import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Users, ClipboardCheck, GraduationCap, Trophy } from 'lucide-react';

const modules = [
  {
    icon: Users,
    number: '01',
    title: 'Faculty Module',
    description: 'Complete faculty profile management including personal details, qualifications, performance tracking, and individual scorecards.',
    features: ['Profile Management', 'Performance Tracking', 'Personal Scorecards', 'Document Upload'],
    color: 'bg-primary',
  },
  {
    icon: ClipboardCheck,
    number: '02',
    title: 'Evaluation Module',
    description: 'Comprehensive KPI-based assessment system with analytics, benchmarking, and detailed performance reports.',
    features: ['KPI Assessment', 'Analytics Dashboard', 'Benchmarking', 'Report Generation'],
    color: 'bg-info',
  },
  {
    icon: GraduationCap,
    number: '03',
    title: 'Knowledge Module',
    description: 'Curated training programs, MOOC recommendations, certification tracking, and personalized learning paths.',
    features: ['Training Programs', 'MOOC Integration', 'Certifications', 'Learning Paths'],
    color: 'bg-success',
  },
  {
    icon: Trophy,
    number: '04',
    title: 'Motivation Module',
    description: 'Gamification elements including achievement badges, progress tracking, leaderboards, and performance insights.',
    features: ['Achievement Badges', 'Progress Tracking', 'Leaderboards', 'Performance Insights'],
    color: 'bg-accent',
  },
];

export function ModulesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="modules" className="section-padding bg-background">
      <div className="container-wide mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">System Architecture</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-3 mb-6">
            Core Modules
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Four interconnected modules working together to provide a comprehensive faculty development ecosystem.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {modules.map((module, index) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card rounded-2xl overflow-hidden hover-lift group"
            >
              <div className={`h-2 ${module.color}`} />
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${module.color}/10 flex items-center justify-center`}>
                      <module.icon className={`w-7 h-7 ${module.color === 'bg-accent' ? 'text-accent' : module.color === 'bg-success' ? 'text-success' : module.color === 'bg-info' ? 'text-info' : 'text-primary'}`} />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Module {module.number}</span>
                      <h3 className="font-heading text-xl font-bold text-foreground">{module.title}</h3>
                    </div>
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">{module.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {module.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-secondary text-secondary-foreground"
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
