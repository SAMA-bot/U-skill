import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Target, Lightbulb, Users, BarChart3 } from 'lucide-react';

const highlights = [
  {
    icon: BarChart3,
    title: 'Data-Driven Assessment',
    description: 'Objective metrics and KPI-based evaluation for fair performance analysis.',
    gradient: 'linear-gradient(135deg, hsl(210 100% 60% / 0.12), hsl(185 80% 55% / 0.08))',
    iconColor: 'text-primary',
  },
  {
    icon: Lightbulb,
    title: 'Personalized Recommendations',
    description: 'AI-powered suggestions for training, MOOCs, and certifications.',
    gradient: 'linear-gradient(135deg, hsl(270 65% 62% / 0.12), hsl(210 100% 60% / 0.08))',
    iconColor: 'text-accent',
  },
  {
    icon: Target,
    title: 'Skill Gap Identification',
    description: 'Automatic detection of areas needing improvement in teaching and research.',
    gradient: 'linear-gradient(135deg, hsl(185 80% 55% / 0.12), hsl(160 70% 45% / 0.08))',
    iconColor: 'text-info',
  },
  {
    icon: Users,
    title: 'Motivation & Gamification',
    description: 'Achievement badges, progress tracking, and performance insights.',
    gradient: 'linear-gradient(135deg, hsl(270 65% 62% / 0.12), hsl(290 60% 55% / 0.08))',
    iconColor: 'text-accent',
  },
];

export function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="about" className="section-padding relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="container-wide mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-xs uppercase tracking-[0.2em]">About The Project</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6 tracking-tight">
            Transforming Faculty Development
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            This project develops an integrated web-based application to assess faculty performance using objective metrics, identify skill gaps, and recommend capacity-building programs.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card-hover p-6 rounded-xl group relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: item.gradient }} />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 border border-border/50" style={{ background: item.gradient }}>
                  <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                </div>
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
