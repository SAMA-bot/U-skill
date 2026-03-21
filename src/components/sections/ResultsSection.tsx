import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { TrendingUp, Scale, Compass, ClipboardList } from 'lucide-react';

const results = [
  { icon: TrendingUp, value: '30%', title: 'Increase in Engagement', description: 'Expected boost in faculty participation through gamification and rewards.' },
  { icon: Scale, value: '100%', title: 'Fair & Transparent', description: 'Objective, data-driven performance evaluation eliminating bias.' },
  { icon: Compass, value: 'Personalized', title: 'Career Development', description: 'Tailored growth paths based on individual skills and goals.' },
  { icon: ClipboardList, value: '↓ Workload', title: 'Administrative Efficiency', description: 'Reduced manual work through automated data management.' },
];

export function ResultsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full blur-[160px] opacity-[0.06]"
        style={{ background: 'hsl(270 65% 62%)' }} />

      <div className="container-wide mx-auto relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-xs uppercase tracking-[0.2em]">Expected Impact</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6 tracking-tight">
            Projected Results
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The platform is designed to deliver measurable improvements across faculty engagement, evaluation fairness, and institutional efficiency.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {results.map((result, index) => (
            <motion.div
              key={result.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card-hover rounded-2xl p-6 text-center group"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{
                background: 'linear-gradient(135deg, hsl(210 100% 60% / 0.12), hsl(270 65% 62% / 0.08))',
              }}>
                <result.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold font-heading gradient-text mb-2">{result.value}</div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{result.title}</h3>
              <p className="text-sm text-muted-foreground">{result.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
