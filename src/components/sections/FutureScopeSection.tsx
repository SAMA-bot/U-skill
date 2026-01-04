import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, Building2, Bot, Users2, LineChart } from 'lucide-react';

const futureScope = [
  {
    icon: Building2,
    title: 'HRMS Integration',
    description: 'Seamless integration with existing Human Resource Management Systems for unified data flow.',
  },
  {
    icon: Bot,
    title: 'AI-based Mentor Matchmaking',
    description: 'Intelligent pairing of faculty with mentors based on skills, goals, and compatibility.',
  },
  {
    icon: Users2,
    title: 'Peer-to-Peer Mentoring',
    description: 'Collaborative learning network enabling faculty to share expertise and knowledge.',
  },
  {
    icon: LineChart,
    title: 'Predictive Analytics',
    description: 'Advanced analytics for faculty retention prediction and proactive interventions.',
  },
];

export function FutureScopeSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="section-padding bg-background">
      <div className="container-wide mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">What's Next</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-3 mb-6">
            Future Scope
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Our roadmap includes exciting enhancements that will further transform faculty development and institutional management.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {futureScope.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div className="glass-card p-6 rounded-2xl hover-lift h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>

                {/* Arrow connector for desktop */}
                {index < futureScope.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-primary/50" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
