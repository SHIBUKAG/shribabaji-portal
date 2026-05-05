export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#home" className="navbar-logo" style={{ marginBottom: '1rem' }}>
              <div className="logo-icon">🔩</div>
              <div className="logo-text">
                <span className="logo-name">Shree Babaji</span>
                <span className="logo-tagline">Welding Works</span>
              </div>
            </a>
            <p>
              Premium manufacturer of agriculture instruments in MP.
              Built by experts, trusted by farmers.
            </p>
            <div className="social-links">
              <a href="#" className="social-link" title="Facebook">FB</a>
              <a href="#" className="social-link" title="Instagram">IG</a>
              <a href="#" className="social-link" title="WhatsApp">WA</a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Products</h4>
            <ul className="footer-links">
              <li><a href="#products">Cultivators</a></li>
              <li><a href="#products">Plows</a></li>
              <li><a href="#products">Harrows</a></li>
              <li><a href="#products">Seed Drills</a></li>
              <li><a href="#products">Custom Tools</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li><a href="#about">About Us</a></li>
              <li><a href="#services">Our Services</a></li>
              <li><a href="#testimonials">Testimonials</a></li>
              <li><a href="#contact">Contact Us</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Working Hours</h4>
            <ul className="footer-links" style={{ color: 'var(--clr-text-muted)' }}>
              <li>Mon - Sat: 9:00 AM - 7:00 PM</li>
              <li>Sunday: Closed</li>
              <li style={{ marginTop: '1rem' }}>
                <strong style={{ color: 'var(--clr-text)' }}>Workshop:</strong><br />
                Balipur, Teshil Manawar, District Dhar
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {currentYear} Shree Babaji Welding Works. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
