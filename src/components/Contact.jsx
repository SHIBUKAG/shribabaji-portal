import { useState } from 'react'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    interest: 'cultivator',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Simulated form submission
    setTimeout(() => {
      setSubmitted(true)
      setFormData({ name: '', phone: '', interest: 'cultivator', message: '' })
      setTimeout(() => setSubmitted(false), 5000)
    }, 1000)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <section className="contact" id="contact">
      <div className="container">
        <div className="contact-grid">
          <div className="contact-info reveal-left">
            <span className="section-tag">📞 Contact Us</span>
            <h2 className="section-title">
              Let's Talk <span>Business</span>
            </h2>
            <p className="section-subtitle">
              Ready to upgrade your farm equipment or have a custom requirement?
              Reach out to us today. Our team is always ready
              to assist you.
            </p>

            <div className="contact-details">
              <div className="contact-detail">
                <div className="contact-detail-icon">📍</div>
                <div className="contact-detail-text">
                  <h4>Factory Workshop</h4>
                  <p>Main Road, Balipur,<br />Teshil Manawar, District Dhar, MP</p>
                </div>
              </div>

              <div className="contact-detail">
                <div className="contact-detail-icon">📞</div>
                <div className="contact-detail-text">
                  <h4>Call Us Directly</h4>
                  <a href="tel:+919876543210">+91 98765 43210</a>
                  <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-dim)', marginTop: '2px' }}>
                    Mon - Sat (9:00 AM - 7:00 PM)
                  </p>
                </div>
              </div>

              <div className="contact-detail">
                <div className="contact-detail-icon">✉️</div>
                <div className="contact-detail-text">
                  <h4>Email Enquiries</h4>
                  <a href="mailto:info@shreebabajiwelding.com">
                    info@shreebabajiwelding.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-wrap reveal-right">
            <form className="contact-form" onSubmit={handleSubmit}>
              <h3>Send a Message</h3>

              {submitted ? (
                <div className="form-success">
                  <div className="form-success-icon">✅</div>
                  <h4>Message Sent!</h4>
                  <p>Our team will contact you shortly.</p>
                </div>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="name">Full Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Ramesh Patil"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="98765 43210"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="interest">Product of Interest</label>
                    <select
                      id="interest"
                      name="interest"
                      value={formData.interest}
                      onChange={handleChange}
                    >
                      <option value="cultivator">Heavy Duty Cultivator</option>
                      <option value="plow">MB Mould Board Plow</option>
                      <option value="harrow">Disc Harrow</option>
                      <option value="seed_drill">Seed Drill / Planter</option>
                      <option value="other">Other / Custom Order</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Additional Details</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Please specify tractor HP or any specific requirements..."
                    />
                  </div>

                  <button type="submit" className="btn-submit">
                    Send Request 🚀
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
