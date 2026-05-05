const testimonials = [
  {
    text: 'I purchased a 9-tyne cultivator from Shree Babaji last kharif season. Even after 3 seasons of heavy use on black cotton soil, not a single weld has given way. Truly built to last!',
    name: 'Ramesh Patil',
    location: 'Dhar, MP',
    emoji: '👨‍🌾',
    stars: 5,
  },
  {
    text: 'Best prices in the region! I compared with dealers in Indore and these guys beat everyone on price and quality. The disc harrow I bought is perfectly balanced and very easy to attach.',
    name: 'Suresh Khedkar',
    location: 'Khargone, MP',
    emoji: '🧑‍🌾',
    stars: 5,
  },
  {
    text: 'We placed a bulk order of 20 cultivators for our Farmer Producer Organization. The delivery was on time, the products were exactly as described, and the after-sale support was excellent.',
    name: 'Vijay Deshmukh',
    location: 'Barwani, MP',
    emoji: '👴',
    stars: 5,
  },
]

export default function Testimonials() {
  return (
    <section className="testimonials" id="testimonials">
      <div className="container">
        <div className="testimonials-header">
          <span className="section-tag reveal">💬 Testimonials</span>
          <h2 className="section-title reveal">
            Farmers <span>Trust Us</span>
          </h2>
          <p className="section-subtitle reveal">
            Don't just take our word for it — hear from the farmers who work
            with our tools every single day.
          </p>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <div className="testimonial-card reveal" key={i} style={{ transitionDelay: `${i * 0.12}s` }}>
              <div className="quote-icon">"</div>
              <div className="stars">{'★'.repeat(t.stars)}</div>
              <p className="testimonial-text">{t.text}</p>
              <div className="testimonial-author">
                <div className="author-avatar">{t.emoji}</div>
                <div>
                  <div className="author-name">{t.name}</div>
                  <div className="author-location">📍 {t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
