const features = [
  {
    icon: '🔥',
    title: 'Expert Welding Craftsmanship',
    desc: 'Each instrument undergoes precision MIG & ARC welding with quality-grade steel for maximum durability.',
  },
  {
    icon: '🌿',
    title: 'Farmer-Centric Design',
    desc: 'Tools engineered for Indian soil types — black cotton, alluvial and red soil compatible.',
  },
  {
    icon: '🏆',
    title: 'Decades of Trust',
    desc: 'Over 25 years serving farmers across MP with reliable, long-lasting agricultural equipment.',
  },
]

export default function About() {
  return (
    <section className="about" id="about">
      <div className="container">
        <div className="about-grid">
          {/* Visual */}
          <div className="about-visual reveal-left">
            <div className="about-img-wrap">
              <img src="/hero.png" alt="Shree Babaji Welding Works workshop and agriculture tools" />
              <div className="about-img-overlay" />
            </div>
            <div className="about-badge">
              <div className="about-badge-num">25+</div>
              <div className="about-badge-text">Years of Excellence</div>
            </div>
          </div>

          {/* Content */}
          <div className="about-content reveal-right">
            <span className="section-tag">⚒️ About Us</span>
            <h2 className="section-title">
              Forged with Passion,<br />
              <span>Built for the Field</span>
            </h2>
            <p className="section-subtitle">
              Shree Babaji Welding Works was founded with a single mission — to
              provide Indian farmers with affordable, high-quality agriculture
              instruments crafted right here in MP. We combine
              traditional welding expertise with modern design to deliver tools
              that truly perform.
            </p>

            <div className="about-features">
              {features.map((f, i) => (
                <div className="about-feature" key={i}>
                  <div className="about-feature-icon">{f.icon}</div>
                  <div className="about-feature-text">
                    <h4>{f.title}</h4>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
