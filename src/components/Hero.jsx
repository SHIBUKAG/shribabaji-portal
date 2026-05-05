export default function Hero() {
  return (
    <section className="hero" id="home">
      {/* Background Image */}
      <div className="hero-bg" />
      <div className="hero-overlay" />

      <div className="container hero-content">
        <div className="hero-label">
          <span className="dot-pulse" />
          Trusted Since 2000 · Balipur, MP
        </div>

        <h1>
          <span className="line1">Shree Babaji</span>
          <span className="line2">Welding Works</span>
          <span className="line3">Agriculture Instruments Manufacturer & Retailer</span>
        </h1>

        <p className="hero-desc">
          Crafting precision-engineered agricultural tools that empower Indian
          farmers. From robust cultivators and plows to durable harrows —
          built with <strong>superior welding craftsmanship</strong> to last
          seasons on end.
        </p>

        <div className="hero-cta">
          <a href="#products" className="btn-primary" id="hero-view-products-btn">
            🌾 View Products
          </a>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-num">25+</span>
            <span className="hero-stat-label">Years Experience</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">10K+</span>
            <span className="hero-stat-label">Products Sold</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">5K+</span>
            <span className="hero-stat-label">Happy Farmers</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">15+</span>
            <span className="hero-stat-label">Instrument Types</span>
          </div>
        </div>
      </div>

      <div className="scroll-indicator">
        <div className="scroll-mouse">
          <div className="scroll-wheel" />
        </div>
        <span className="scroll-text">Scroll</span>
      </div>
    </section>
  )
}
