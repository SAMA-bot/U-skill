import { GraduationCap, MapPin, Mail, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer id="contact" className="bg-foreground text-background">
      <div className="container-wide mx-auto section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Institution Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-xl">SKIT Jaipur</h3>
                <p className="text-sm opacity-70">Department of Computer Science & Engineering</p>
              </div>
            </div>
            <p className="text-sm opacity-80 leading-relaxed max-w-md">
              Swami Keshvanand Institute of Technology, Management & Gramothan (SKIT) is committed to excellence in technical education and research. This project represents our dedication to innovative solutions for academic development.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {['About Project', 'Features', 'Modules', 'Technology', 'Team'].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase().replace(' ', '-')}`}
                    className="text-sm opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 opacity-70" />
                <span className="text-sm opacity-80">
                  Ramnagaria, Jagatpura, Jaipur, Rajasthan 302017
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 opacity-70" />
                <a href="mailto:cse@skit.ac.in" className="text-sm opacity-80 hover:opacity-100">
                  cse@skit.ac.in
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 opacity-70" />
                <span className="text-sm opacity-80">+91 141 2752165</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-background/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm opacity-60">
              © 2025 SKIT Jaipur. Final Year Project – Academic Year 2025-26
            </p>
            <p className="text-sm opacity-60">
              Computer Science & Engineering Department
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
