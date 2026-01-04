import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const technologies = [
  {
    name: 'React.js',
    category: 'Frontend',
    description: 'Component-based UI library for building interactive interfaces',
    icon: '⚛️',
    color: 'from-blue-400 to-cyan-400',
  },
  {
    name: 'Node.js',
    category: 'Backend',
    description: 'JavaScript runtime for scalable server-side applications',
    icon: '🟢',
    color: 'from-green-500 to-emerald-500',
  },
  {
    name: 'MongoDB',
    category: 'Database',
    description: 'NoSQL database for flexible, document-based data storage',
    icon: '🍃',
    color: 'from-green-600 to-lime-500',
  },
  {
    name: 'Express.js',
    category: 'API',
    description: 'Fast, minimalist web framework for RESTful API development',
    icon: '⚡',
    color: 'from-gray-500 to-gray-600',
  },
];

export function TechnologySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="technology" className="section-padding bg-section-alt">
      <div className="container-wide mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Tech Stack</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-3 mb-6">
            Technologies Used
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Built on the robust MERN Stack architecture for scalability, performance, and modern development practices.
          </p>
        </motion.div>

        {/* MERN Stack Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-12"
        >
          <div className="glass-card px-8 py-4 rounded-full inline-flex items-center gap-3">
            <span className="text-2xl">🏗️</span>
            <span className="font-heading font-bold text-xl gradient-text">MERN Stack Architecture</span>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="glass-card rounded-2xl overflow-hidden hover-lift group"
            >
              <div className={`h-1.5 bg-gradient-to-r ${tech.color}`} />
              <div className="p-6 text-center">
                <div className="text-5xl mb-4">{tech.icon}</div>
                <span className="text-xs font-medium text-primary uppercase tracking-wider">{tech.category}</span>
                <h3 className="font-semibold text-xl text-foreground mt-1 mb-2">{tech.name}</h3>
                <p className="text-sm text-muted-foreground">{tech.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
