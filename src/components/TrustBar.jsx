const items = [
  { icon: '✅', text: 'ISI Quality Certified' },
  { icon: '🚚', text: 'Pan-MP Delivery' },
  { icon: '🔧', text: 'Custom Fabrication Available' },
  { icon: '🌾', text: 'Trusted by 5K+ Customers' },
  { icon: '⚙️', text: 'Heavy-Duty Welding Expertise' },
  { icon: '🏭', text: 'Direct Manufacturer Prices' },
  { icon: '📞', text: '24/7 After-Sale Support' },
  { icon: '🤝', text: 'Bulk & Wholesale Orders Welcome' },
]

export default function TrustBar() {
  const doubled = [...items, ...items]

  return (
    <div className="trust-bar">
      <div className="trust-bar-inner">
        {doubled.map((item, i) => (
          <div className="trust-item" key={i}>
            <span>{item.icon}</span>
            {item.text}
          </div>
        ))}
      </div>
    </div>
  )
}
