const products = [
  {
    emoji: '🌾',
    category: 'Tillage',
    name: 'Heavy Duty Cultivator',
    desc: 'Multi-tyne cultivator designed for deep tillage and weed control. Heavy-gauge frame with replaceable tines.',
    tags: ['3-9 Tyne', 'Tractor-fit'],
    gradient: 'linear-gradient(135deg, #2d1b00, #4a2e00)',
  },
  {
    emoji: '🔨',
    category: 'Plowing',
    name: 'MB Mould Board Plow',
    desc: 'High-quality mould board plough for primary tillage. Excellent furrow inversion and weed burial.',
    tags: ['Single/Double', 'All Soil'],
    gradient: 'linear-gradient(135deg, #0a1a2e, #0f2d4a)',
  },
  {
    emoji: '🪚',
    category: 'Harrowing',
    name: 'Disc Harrow',
    desc: 'Tandem disc harrow for secondary tillage. Breaks clods, incorporates crop residue, and levels soil.',
    tags: ['12-24 Disc', 'Tractor-fit'],
    gradient: 'linear-gradient(135deg, #1a2a00, #2d4a00)',
  },
  {
    emoji: '🌱',
    category: 'Seeding',
    name: 'Seed Drill / Planter',
    desc: 'Precision seed drill for accurate seed placement at consistent depth and spacing across rows.',
    tags: ['7-11 Row', 'Adjustable'],
    gradient: 'linear-gradient(135deg, #00221a, #003d2e)',
  },
  {
    emoji: '⚙️',
    category: 'Weeding',
    name: 'Rotary Weeder',
    desc: 'Lightweight rotary weeder for inter-row cultivation. Removes weeds while aerating the topsoil.',
    tags: ['Manual & Power', 'Lightweight'],
    gradient: 'linear-gradient(135deg, #2a0022, #4a003d)',
  },
  {
    emoji: '🏗️',
    category: 'Land Leveling',
    name: 'Blade / Leveling Blade',
    desc: 'Heavy-duty land leveling blade for field preparation. Adjustable angle for precise grading.',
    tags: ['6-12 Ft', 'Adjustable'],
    gradient: 'linear-gradient(135deg, #1a1000, #3a2500)',
  },
]

export default function Products() {
  return (
    <section className="products" id="products">
      <div className="container">
        <div className="products-header">
          <span className="section-tag reveal">🌾 Our Products</span>
          <h2 className="section-title reveal">
            Agriculture <span>Instruments</span>
          </h2>
          <p className="section-subtitle reveal">
            A comprehensive range of farm tools — from primary tillage to
            seeding and weeding — crafted for performance and durability.
          </p>
        </div>

        <div className="products-grid">
          {products.map((p, i) => (
            <div className="product-card reveal" key={i} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="product-img" style={{ background: p.gradient }}>
                <div className="product-img-bg">{p.emoji}</div>
                <span style={{ position: 'relative', zIndex: 1, fontSize: '4rem' }}>
                  {p.emoji}
                </span>
              </div>
              <div className="product-info">
                <p className="product-category">{p.category}</p>
                <h3 className="product-name">{p.name}</h3>
                <p className="product-desc">{p.desc}</p>
                <div className="product-footer">
                  <div className="product-tags">
                    {p.tags.map((t) => (
                      <span className="tag" key={t}>{t}</span>
                    ))}
                  </div>
                  <button className="product-btn" title={`Enquire about ${p.name}`}>→</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
