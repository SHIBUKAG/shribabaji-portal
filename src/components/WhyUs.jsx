const points = [
  {
    title: 'Premium Steel, Local Pride',
    desc: 'We source only high-tensile Indian steel to ensure every weld and joint withstands years of heavy field use.',
  },
  {
    title: 'Direct Factory Pricing',
    desc: 'As a manufacturer, we cut out the middleman. You get the best quality at the most competitive prices in the market.',
  },
  {
    title: 'Certified Welding Processes',
    desc: 'Our workshops use MIG, ARC, and TIG welding techniques by skilled certified welders for every product.',
  },
  {
    title: 'Fast Turnaround & Delivery',
    desc: 'Ready stock for most items. Custom orders are fulfilled within 7-15 days with delivery across MP.',
  },
]

const stats = [
  { num: '25+', label: 'Years in Business' },
  { num: '300+', label: 'Satisfied Farmers' },
  { num: '15+', label: 'Product Variants' },
  { num: '5⭐', label: 'Average Rating' },
]

export default function WhyUs() {
  return (
    <section className="whyus" id="whyus">
      <div className="container">
        <div className="whyus-grid">
          <div className="whyus-content reveal-left">
            <span className="section-tag">🏆 Why Choose Us</span>
            <h2 className="section-title">
              The Craft Behind <span>Every Tool</span>
            </h2>
            <p className="section-subtitle">
              We don't just make tools — we build relationships with the farmers
              who depend on them. Here's why Shree Babaji Welding Works is the
              preferred choice across MP.
            </p>

            <div className="whyus-points">
              {points.map((p, i) => (
                <div className="whyus-point" key={i}>
                  <span className="point-num">0{i + 1}</span>
                  <div className="point-text">
                    <h4>{p.title}</h4>
                    <p>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="whyus-visual reveal-right">
            {stats.map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-num">{s.num}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
