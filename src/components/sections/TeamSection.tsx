import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Palette, Server, TestTube, Database, BookOpen, FlaskConical } from 'lucide-react';

const teamMembers = [
  { name: 'Devendra Kushwah', role: 'Frontend & UI/UX', icon: Palette, description: 'Designing intuitive and responsive user interfaces' },
  { name: 'Abhimanyu Banerjee', role: 'Backend & API Development', icon: Server, description: 'Building robust server-side architecture and APIs' },
  { name: 'Aryan Rawat', role: 'Testing & Quality Assurance', icon: TestTube, description: 'Ensuring reliability through comprehensive testing' },
  { name: 'Kunal Binwal', role: 'Database Design', icon: Database, description: 'Architecting efficient data storage solutions' },
];

const mentors = [
  { name: 'Dr. Neelam Chaudhary', role: 'Project Mentor', designation: 'Associate Professor', icon: BookOpen },
  { name: 'Dr. Anjana Sangwan', role: 'Lab Coordinator', designation: 'Associate Professor', icon: FlaskConical },
];

export function TeamSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="team" className="section-padding relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container-wide mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-xs uppercase tracking-[0.2em]">The People</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6 tracking-tight">
            Our Team
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A dedicated team of final-year engineering students bringing diverse skills to create this comprehensive platform.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card-hover rounded-2xl p-6 text-center group"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300" style={{
                background: 'linear-gradient(135deg, hsl(210 100% 60% / 0.1), hsl(270 65% 62% / 0.1))',
              }}>
                <member.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-1">{member.name}</h3>
              <p className="text-primary font-medium text-sm mb-2">{member.role}</p>
              <p className="text-sm text-muted-foreground">{member.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-center font-heading text-2xl font-bold text-foreground mb-8 tracking-tight">
            Under the Guidance of
          </h3>
          <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {mentors.map((mentor, index) => (
              <motion.div
                key={mentor.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="glass-card-hover rounded-2xl p-6 flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, hsl(270 65% 62% / 0.12), hsl(290 60% 55% / 0.08))',
                }}>
                  <mentor.icon className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-foreground">{mentor.name}</h4>
                  <p className="text-primary text-sm font-medium">{mentor.role}</p>
                  <p className="text-muted-foreground text-sm">{mentor.designation}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
