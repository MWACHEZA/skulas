import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/landing.css';

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="acadex-landing" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="landing-nav container">
        <div className="logo cursor-pointer" onClick={() => navigate('/')}>
          ACAD<span>EX</span>
        </div>
        <div className="cta">
          <Link to="/" className="btn-premium btn-ghost-premium">Back to Home</Link>
        </div>
      </nav>

      <section className="hero-section container" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="hero-content text-center">
          <div className="hero-eyebrow">Work in Progress</div>
          <h1 style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>
            <span>Coming Soon</span>
          </h1>
          <p style={{ maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
            We are actively building this feature. Our engineering team is working hard to bring this to you in the next major update. Stay tuned for an even more powerful Acadex experience!
          </p>
          <div className="hero-btns justify-center">
            <button onClick={() => navigate(-1)} className="btn-premium btn-primary-premium">
              Go Back
            </button>
            <Link to="/" className="btn-premium btn-outline-premium">
              Return Home
            </Link>
          </div>
        </div>
      </section>
      
      <footer className="landing-footer container text-center" style={{ paddingBottom: '2rem' }}>
        <p>&copy; {new Date().getFullYear()} ACADEX Platform. Empowering Education 🌍</p>
      </footer>
    </div>
  );
}
