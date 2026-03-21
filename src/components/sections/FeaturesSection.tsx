import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { 
  UserPlus, User, FileSpreadsheet, Calculator, Search, BookMarked, LayoutDashboard 
} from 'lucide-react';

const features = [
  { icon: UserPlus, title: 'Secure Faculty Registration & Login', description: 'Role-based authentication with secure password management and session handling.' },
  { icon: User, title: 'Faculty Profile Management', description: 'Comprehensive profile system for storing qualifications, experience, and achievements.' },
  { icon: FileSpreadsheet, title: 'Performance Data Entry', description: 'Structured input for teaching, research, certifications, and administrative work.' },
  { icon: Calculator, title: 'Automated Score Calculation', description: 'Algorithm-driven performance scoring based on predefined KPIs and metrics.' },
  { icon: Search, title: 'Skill Gap Identification', description: 'Intelligent analysis to detect areas requiring improvement and development.' },
  { icon: BookMarked, title: 'Personalized Training Recommendations', description: 'AI-suggested courses, MOOCs, and certifications tailored to individual needs.' },
  { icon: LayoutDashboard, title: 'Admin Dashboard', description: 'Institutional reporting with analytics, charts, and exportable reports.' },
];

export function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="section-padding relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full blur-[150px] opacity-[0.04]"
        style={{ background: 'hsl(210 100% 60%)' }} />

      <div className="container-wide mx-auto relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-xs uppercase tracking-[0.2em]">Functional Requirements</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6 tracking-tight">
            Platform Features
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A comprehensive set of features designed to streamline faculty management and development processes.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="glass-card-hover p-6 rounded-xl group"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 border border-border/50 group-hover:border-primary/30 transition-colors" style={{
                  background: 'linear-gradient(135deg, hsl(210 100% 60% / 0.1), hsl(270 65% 62% / 0.05))',
                }}>
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
