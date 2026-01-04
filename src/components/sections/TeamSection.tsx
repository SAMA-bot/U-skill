import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { User, Palette, Server, TestTube, Database, BookOpen, FlaskConical } from 'lucide-react';

const teamMembers = [
  {
    name: 'Devendra Kushwah',
    role: 'Frontend & UI/UX',
    icon: Palette,
    description: 'Designing intuitive and responsive user interfaces',
  },
  {
    name: 'Abhimanyu Banerjee',
    role: 'Backend & API Development',
    icon: Server,
    description: 'Building robust server-side architecture and APIs',
  },
  {
    name: 'Aryan Rawat',
    role: 'Testing & Quality Assurance',
    icon: TestTube,
    description: 'Ensuring reliability through comprehensive testing',
  },
  {
    name: 'Kunal Binwal',
    role: 'Database Design',
    icon: Database,
    description: 'Architecting efficient data storage solutions',
  },
];

const mentors = [
  {
    name: 'Dr. Neelam Chaudhary',
    role: 'Project Mentor',
    designation: 'Associate Professor',
    icon: BookOpen,
  },
  {
    name: 'Dr. Anjana Sangwan',
    role: 'Lab Coordinator',
    designation: 'Associate Professor',
    icon: FlaskConical,
  },
];

export function TeamSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="team" className="section-padding bg-section-alt">
      <div className="container-wide mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">The People</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-3 mb-6">
            Our Team
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A dedicated team of final-year engineering students bringing diverse skills to create this comprehensive platform.
          </p>
        </motion.div>

        {/* Team Members */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card rounded-2xl p-6 text-center hover-lift group"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <member.icon className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-1">{member.name}</h3>
              <p className="text-primary font-medium text-sm mb-2">{member.role}</p>
              <p className="text-sm text-muted-foreground">{member.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Mentors */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-center font-heading text-2xl font-bold text-foreground mb-8">
            Under the Guidance of
          </h3>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {mentors.map((mentor, index) => (
              <motion.div
                key={mentor.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="glass-card rounded-2xl p-6 flex items-center gap-4 hover-lift"
              >
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <mentor.icon className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{mentor.name}</h4>
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
