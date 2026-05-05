const services = [
  {
    icon: '🏭',
    title: 'Custom Manufacturing',
    desc: 'Need a specific tool? We fabricate custom agriculture instruments to your exact specifications.',
  },
  {
    icon: '🔧',
    title: 'Repair & Maintenance',
    desc: 'Extend the life of your farm equipment with our expert welding repair and maintenance service.',
  },
  {
    icon: '🚚',
    title: 'Wholesale Supply',
    desc: 'Bulk and wholesale orders for dealers, cooperatives, and government schemes at competitive prices.',
  },
  {
    icon: '📐',
    title: 'On-Site Consultation',
    desc: 'Our experts visit your farm to recommend the right instruments based on your crop and soil type.',
  },
]

export default function Services() {
  return (
    <section className="services" id="services">
      <div className="container">
        <div style={{ textAlign: 'center' }}>
          <span className="section-tag reveal">⚙️ Our Services</span>
          <h2 className="section-title reveal">
            Beyond <span>Just Products</span>
          </h2>
          <p className="section-subtitle reveal" style={{ margin: '0.75rem auto 0' }}>
            We offer end-to-end support — from manufacturing and supply to
            after-sale repair — so your farm never stops.
          </p>
        </div>

        <div className="services-grid">
          {services.map((s, i) => (
            <div className="service-card reveal" key={i} style={{ transitionDelay: `${i * 0.1}s` }}>
              <span className="service-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
