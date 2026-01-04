import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

const navLinks = [
  { href: '#about', label: 'About' },
  { href: '#features', label: 'Features' },
  { href: '#modules', label: 'Modules' },
  { href: '#technology', label: 'Technology' },
  { href: '#team', label: 'Team' },
  { href: '#contact', label: 'Contact' },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-card/95 backdrop-blur-md shadow-lg border-b border-border/50'
          : 'bg-transparent'
      }`}
    >
      <nav className="container-wide mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <motion.a
            href="#"
            className="flex items-center gap-2 text-foreground"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <span className="font-heading font-bold text-lg">SKIT</span>
              <span className="text-xs block text-muted-foreground -mt-1">Faculty Tool</span>
            </div>
          </motion.a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-secondary/50"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* CTA Button & Theme Toggle */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={() => scrollToSection('#contact')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-foreground"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-card/95 backdrop-blur-md border-b border-border"
          >
            <div className="container-wide mx-auto px-4 py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="px-4 py-3 text-left text-foreground font-medium hover:bg-secondary rounded-lg transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <Button
                onClick={() => scrollToSection('#contact')}
                className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Get Started
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
