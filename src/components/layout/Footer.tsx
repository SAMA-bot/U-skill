import { Sparkles, MapPin, Mail, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer id="contact" className="relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, hsl(228 14% 5%), hsl(228 14% 3%))',
    }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="container-wide mx-auto section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Institution Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                backgroundImage: 'linear-gradient(135deg, hsl(210 100% 60%), hsl(270 65% 62%))',
              }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-xl text-foreground">SKIT Jaipur</h3>
                <p className="text-sm text-muted-foreground">Department of Computer Science & Engineering</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Swami Keshvanand Institute of Technology, Management & Gramothan (SKIT) is committed to excellence in technical education and research. This project represents our dedication to innovative solutions for academic development.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold text-lg text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {['About Project', 'Features', 'Modules', 'Technology', 'Team'].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase().replace(' ', '-')}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-heading font-semibold text-lg text-foreground mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Ramnagaria, Jagatpura, Jaipur, Rajasthan 302017
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href="mailto:cse@skit.ac.in" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  cse@skit.ac.in
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">+91 141 2752165</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 SKIT Jaipur. Final Year Project – Academic Year 2025-26
            </p>
            <p className="text-sm text-muted-foreground">
              Computer Science & Engineering Department
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
