import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { CheckCircle } from 'lucide-react';

const objectives = [
  'Assess faculty performance using KPI-based evaluation metrics',
  'Identify skill gaps in teaching, research, and service areas',
  'Recommend personalized training, MOOCs, and certifications',
  'Motivate faculty through gamification and performance insights',
  'Simplify faculty data management for institutions',
];

export function ObjectivesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container-wide mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Visual Side */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-square max-w-md mx-auto lg:mx-0 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full border border-dashed border-border/40" />
              </div>
              <div className="absolute inset-8 flex items-center justify-center">
                <div className="w-full h-full rounded-full border border-dashed border-border/60" />
              </div>
              <div className="absolute inset-16 flex items-center justify-center">
                <div className="w-full h-full rounded-full flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, hsl(210 100% 60% / 0.08), hsl(270 65% 62% / 0.08))',
                }}>
                  <div className="text-center p-8">
                    <div className="text-5xl font-bold font-heading gradient-text mb-2">5</div>
                    <div className="text-lg font-heading font-medium text-foreground">Core Objectives</div>
                    <div className="text-sm text-muted-foreground mt-1">Driving Excellence</div>
                  </div>
                </div>
              </div>

              {['KPI', 'AI', 'Growth'].map((label, i) => (
                <motion.div
                  key={label}
                  animate={{ y: [0, -8, 0], rotate: [0, i % 2 === 0 ? 3 : -3, 0] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                  className={`absolute glass-card px-4 py-2 rounded-full text-sm font-medium border border-primary/20 ${
                    i === 0 ? 'top-0 right-8' : i === 1 ? 'bottom-12 left-0' : 'top-1/3 right-0'
                  }`}
                >
                  <span className="gradient-text">{label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Content Side */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="text-primary font-medium text-xs uppercase tracking-[0.2em]">Our Mission</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mt-4 mb-6 tracking-tight">
              Project Objectives
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Our platform is designed with clear, measurable objectives to ensure meaningful impact on faculty development and institutional growth.
            </p>

            <div className="space-y-3">
              {objectives.map((objective, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/30 hover:border-primary/20 transition-all duration-300"
                >
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-foreground font-medium text-sm">{objective}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
