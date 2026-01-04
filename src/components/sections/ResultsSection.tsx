import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { TrendingUp, Scale, Compass, ClipboardList } from 'lucide-react';

const results = [
  {
    icon: TrendingUp,
    value: '30%',
    title: 'Increase in Engagement',
    description: 'Expected boost in faculty participation through gamification and rewards.',
  },
  {
    icon: Scale,
    value: '100%',
    title: 'Fair & Transparent',
    description: 'Objective, data-driven performance evaluation eliminating bias.',
  },
  {
    icon: Compass,
    value: 'Personalized',
    title: 'Career Development',
    description: 'Tailored growth paths based on individual skills and goals.',
  },
  {
    icon: ClipboardList,
    value: '↓ Workload',
    title: 'Administrative Efficiency',
    description: 'Reduced manual work through automated data management.',
  },
];

export function ResultsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="section-padding bg-foreground text-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-info rounded-full blur-3xl" />
      </div>

      <div className="container-wide mx-auto relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Expected Impact</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mt-3 mb-6">
            Projected Results
          </h2>
          <p className="text-lg opacity-80 leading-relaxed">
            The platform is designed to deliver measurable improvements across faculty engagement, evaluation fairness, and institutional efficiency.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {results.map((result, index) => (
            <motion.div
              key={result.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-background/10 backdrop-blur-sm border border-background/20 rounded-2xl p-6 text-center hover:bg-background/15 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <result.icon className="w-7 h-7 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary mb-2">{result.value}</div>
              <h3 className="font-semibold text-lg mb-2">{result.title}</h3>
              <p className="text-sm opacity-70">{result.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
