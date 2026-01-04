import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Target, Lightbulb, Users, BarChart3 } from 'lucide-react';

const highlights = [
  {
    icon: BarChart3,
    title: 'Data-Driven Assessment',
    description: 'Objective metrics and KPI-based evaluation for fair performance analysis.',
  },
  {
    icon: Lightbulb,
    title: 'Personalized Recommendations',
    description: 'AI-powered suggestions for training, MOOCs, and certifications.',
  },
  {
    icon: Target,
    title: 'Skill Gap Identification',
    description: 'Automatic detection of areas needing improvement in teaching and research.',
  },
  {
    icon: Users,
    title: 'Motivation & Gamification',
    description: 'Achievement badges, progress tracking, and performance insights.',
  },
];

export function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="about" className="section-padding bg-section-alt">
      <div className="container-wide mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">About The Project</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-3 mb-6">
            Transforming Faculty Development
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            This project develops an integrated web-based application to assess faculty performance using objective metrics, identify skill gaps, and recommend capacity-building programs for continuous professional development.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-6 rounded-xl hover-lift group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <item.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
