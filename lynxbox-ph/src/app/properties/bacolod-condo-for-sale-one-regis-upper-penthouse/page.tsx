'use client';

import { useState, useEffect, useCallback } from 'react';

const PROPERTY_ID = 'one-regis-upu';

// S3 keys matching the original filenames uploaded to properties/one-regis-upu/
const IMAGE_KEYS = [
  'properties/one-regis-upu/P-UPU Living room.jpg',
  'properties/one-regis-upu/P-UPU Living room10.jpg',
  'properties/one-regis-upu/P-UPU Living Dining day2.jpg',
  'properties/one-regis-upu/P-UPU living dining bedroom view.jpg',
  'properties/one-regis-upu/P-UPU Kitchen Dining Living2.jpg',
  'properties/one-regis-upu/P-UPU Kitchen2.jpg',
  'properties/one-regis-upu/P-UPU Bedroom1.jpg',
  'properties/one-regis-upu/P-UPU Bedroom2.jpg',
  'properties/one-regis-upu/P-UPU Bedroom2(1).jpg',
  'properties/one-regis-upu/P-UPU Bedroom4.jpg',
  'properties/one-regis-upu/P-UPU Bedrom6.jpg',
  'properties/one-regis-upu/P-UPU Bath2.jpg',
  'properties/one-regis-upu/P-UPU Bath6.jpg',
  'properties/one-regis-upu/P-UPU Bath small1.jpg',
  'properties/one-regis-upu/P-UPU Utility room1.jpg',
  'properties/one-regis-upu/P-UPU Entry2.jpg',
];

const HIGHLIGHTS = [
  { icon: '📐', text: '50 sqm Floor Area' },
  { icon: '🏙️', text: 'Upper Penthouse (12th Floor)' },
  { icon: '🛏️', text: 'Cozy 1 Bedroom' },
  { icon: '🛋️', text: 'Spacious living room — potential 2nd bedroom' },
  { icon: '🚿', text: '2 Full Bathrooms' },
  { icon: '🍳', text: 'Fully Equipped Kitchen' },
  { icon: '🍽️', text: 'Separate Dining Area' },
  { icon: '🔐', text: 'Keyless Entry' },
  { icon: '📦', text: 'Bonus Utility Room' },
  { icon: '🪑', text: 'Fully Furnished' },
];

const WHY_STANDS_OUT = [
  'Approximately 35% larger than standard 1-bedroom units',
  'Two full bathrooms',
  'Flexible floor plan with multiple-use spaces',
  'Bonus utility room',
  'Spacious living and dining areas',
  'Fully furnished and move-in ready',
  'Upper Penthouse location',
];

const IDEAL_FOR = [
  'Homeowners looking for extra space',
  'Families wanting a comfortable city residence',
  'Professionals working from home',
  'OFWs planning to invest in Bacolod',
  'Investors seeking a premium condo in a prime location',
  'Expats relocating to Bacolod',
];

const CONTACT_METHODS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'viber', label: 'Viber' },
  { value: 'sms', label: 'SMS' },
  { value: 'messenger', label: 'Facebook Messenger' },
  { value: 'email', label: 'Email' },
];

const BUYER_INTENTS = [
  { value: 'future-home', label: 'Looking for my future home' },
  { value: 'investment', label: 'Buying as an investment' },
  { value: 'exploring', label: 'Just exploring options' },
  { value: 'broker', label: "I'm a real estate broker/agent" },
];

const TIMELINES = [
  { value: 'within-30-days', label: 'Within 30 days' },
  { value: 'within-3-months', label: 'Within 3 months' },
  { value: 'within-6-months', label: 'Within 6 months' },
  { value: 'just-researching', label: 'Just researching' },
];

function getApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  // Only swap localhost for the device hostname when on a local network (phone on same WiFi as dev machine).
  // Never swap in production — lynxbox.ph or any non-LAN host keeps the configured URL as-is.
  if (typeof window !== 'undefined' && configured.includes('localhost')) {
    const host = window.location.hostname;
    const isLocalNetwork = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
    if (isLocalNetwork && host !== 'localhost') {
      return configured.replace('localhost', host);
    }
  }
  return configured;
}

async function fetchListingImageUrl(propertyId: string, imageKey: string): Promise<string> {
  const res = await fetch(
    `${getApiUrl()}/api/public/listings/${propertyId}/images/view-url?imageKey=${encodeURIComponent(imageKey)}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data?.viewUrl ?? '';
}

function ListingImage({ propertyId, imageKey, alt, style }: {
  propertyId: string;
  imageKey: string;
  alt: string;
  style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState('');

  const load = useCallback(async () => {
    try {
      const url = await fetchListingImageUrl(propertyId, imageKey);
      setSrc(url);
    } catch {
      // leave blank — placeholder background shows through
    }
  }, [propertyId, imageKey]);

  useEffect(() => { load(); }, [load]);

  if (!src) {
    return <div style={{ ...style, backgroundColor: '#d1d5db' }} />;
  }
  return <img src={src} alt={alt} style={{ ...style, objectFit: 'cover', width: '100%', height: '100%' }} />;
}

export default function OneRegisUpperPenthouse() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [contactMethod, setContactMethod] = useState('');
  const [buyerIntent, setBuyerIntent] = useState('');
  const [timeline, setTimeline] = useState('');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const showToastFn = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const phone = formData.get('phone') as string;
    const email = (formData.get('email') as string) || '';

    const tags = ['one-regis-upu', 'for-sale'];
    if (phone) tags.push(`phone:${phone}`);
    if (contactMethod) tags.push(`contact:${contactMethod}`);
    if (buyerIntent) tags.push(`intent:${buyerIntent}`);
    if (timeline) tags.push(`timeline:${timeline}`);

    const data = {
      name: formData.get('name') as string,
      email,
      source: 'one-regis-upper-penthouse',
      tags,
    };

    try {
      const response = await fetch(
        `${getApiUrl()}/api/signup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      const result = await response.json();
      if (response.ok) {
        setSubmitted(true);
      } else {
        showToastFn(result.error || 'Failed to submit. Please try again.', 'error');
      }
    } catch {
      showToastFn('Network error. Please try again later.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#0e2949',
    border: '1px solid rgba(255,255,255,0.3)',
    width: '100%',
    padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)',
    borderRadius: '8px',
    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%230e2949' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: '36px',
    cursor: 'pointer',
  };

  const formBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <input type="text" name="name" placeholder="Full Name *" required style={inputStyle} />
      <input type="tel" name="phone" placeholder="Mobile Number * (e.g. 09171234567)" required style={inputStyle} />
      <input type="email" name="email" placeholder="Email Address (optional)" style={inputStyle} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.82rem', opacity: 0.8, color: 'white' }}>Preferred Contact Method</label>
        <select
          value={contactMethod}
          onChange={(e) => setContactMethod(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select...</option>
          {CONTACT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.82rem', opacity: 0.8, color: 'white' }}>What best describes you? (optional)</label>
        <select
          value={buyerIntent}
          onChange={(e) => setBuyerIntent(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select...</option>
          {BUYER_INTENTS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.82rem', opacity: 0.8, color: 'white' }}>When are you planning to purchase? (optional)</label>
        <select
          value={timeline}
          onChange={(e) => setTimeline(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select...</option>
          {TIMELINES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          backgroundColor: isLoading ? '#9ca3af' : '#1e3a5f',
          color: 'white',
          width: '100%',
          padding: 'clamp(12px, 3vw, 14px)',
          borderRadius: '8px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          border: 'none',
          fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)',
          fontWeight: '700',
          opacity: isLoading ? 0.7 : 1,
          transition: 'all 0.2s ease',
          marginTop: '4px',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#2d4f7c'; }}
        onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#1e3a5f'; }}
      >
        {isLoading ? 'Sending...' : 'Get Property Details'}
      </button>
    </div>
  );

  const confirmationBox = (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '50%',
        backgroundColor: 'rgba(16,185,129,0.2)', border: '2px solid #10b981',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px auto', fontSize: '1.5rem',
      }}>
        ✓
      </div>
      <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', margin: '0 0 12px 0', fontWeight: '700' }}>
        Thank you for your inquiry!
      </h3>
      <p style={{ fontSize: 'clamp(0.88rem, 2.5vw, 0.95rem)', opacity: 0.9, lineHeight: '1.6', margin: 0 }}>
        We&apos;ve received your request and will get back to you shortly with the property details.
        If you&apos;d like to arrange a viewing, just let us know your preferred date and time.
      </p>
    </div>
  );

  const formCard = (heading: string) => (
    <div style={{
      width: '100%',
      maxWidth: '460px',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      padding: 'clamp(20px, 5vw, 28px)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    }}>
      {submitted ? confirmationBox : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.15rem)', fontWeight: '700', margin: '0 0 4px 0' }}>
                {heading}
              </h3>
              <p style={{ fontSize: 'clamp(0.78rem, 2vw, 0.82rem)', opacity: 0.75, margin: 0 }}>
                Deal directly with the owner — no agent fees or intermediary.
              </p>
            </div>
            {formBody}
          </div>
        </form>
      )}
    </div>
  );

  return (
    <>
      {showToast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '16px 24px', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000,
          maxWidth: '400px', fontSize: '14px', lineHeight: '1.5',
          animation: 'slideIn 0.3s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>{toastType === 'success' ? '✓' : '✕'}</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <main style={{ margin: 0, padding: 0 }}>

        {/* ── Hero ── */}
        <section style={{
          position: 'relative',
          backgroundColor: '#0e2949',
          color: 'white',
          padding: 'clamp(60px, 10vw, 100px) clamp(16px, 4vw, 20px)',
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' }}>
            <ListingImage
              propertyId={PROPERTY_ID}
              imageKey={IMAGE_KEYS[2]}
              alt="One Regis Upper Penthouse living area"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(135deg, rgba(14,41,73,0.93) 0%, rgba(14,41,73,0.78) 100%)',
            zIndex: 1,
          }} />

          <div style={{
            maxWidth: '900px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 20px)',
            position: 'relative', zIndex: 2, width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            gap: 'clamp(16px, 3vw, 24px)',
          }}>
              <img
                src="/lynxboxph-logo.png"
                alt="Lynxbox PH"
                style={{ width: 'clamp(120px, 28vw, 160px)', objectFit: 'contain' }}
              />
              <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 'bold', lineHeight: '1.2', margin: 0 }}>
                50 sqm Upper Penthouse<br />Condo for Sale in Bacolod
              </h1>
              <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', opacity: 0.9, lineHeight: '1.5', margin: 0 }}>
                One Regis, Upper East Township — 12th Floor (highest residential)
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {['50 sqm', '12th Floor', '2 Bathrooms', 'Fully Furnished', 'Move-in Ready'].map((badge) => (
                  <span key={badge} style={{
                    backgroundColor: 'rgba(255,255,255,0.13)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '6px 14px', borderRadius: '20px',
                    fontSize: 'clamp(0.78rem, 2vw, 0.88rem)', fontWeight: '500',
                  }}>
                    {badge}
                  </span>
                ))}
              </div>
          </div>
        </section>

        {/* ── Property Highlights ── */}
        <section style={{ padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: 'white' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', color: '#0e2949', margin: '0 0 clamp(24px, 5vw, 40px) 0', textAlign: 'center' }}>
              Property Highlights
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'clamp(10px, 2.5vw, 16px)' }}>
              {HIGHLIGHTS.map((item) => (
                <div key={item.text} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 18px', backgroundColor: '#f7fafc',
                  borderRadius: '8px', borderLeft: '3px solid #0e2949',
                }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ color: '#0e2949', fontWeight: '500', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Photo Gallery ── */}
        <section style={{ padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: '#f7fafc' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', color: '#0e2949', margin: '0 0 clamp(24px, 5vw, 40px) 0', textAlign: 'center' }}>
              Photo Gallery
            </h2>

            {/* Main image */}
            <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', paddingBottom: '66.6%', backgroundColor: '#e5e7eb', cursor: 'pointer' }}
              onClick={() => setLightboxOpen(true)}>
              <ListingImage
                propertyId={PROPERTY_ID}
                imageKey={IMAGE_KEYS[galleryIndex]}
                alt={`Property photo ${galleryIndex + 1}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              />
              {/* Counter */}
              <div style={{ position: 'absolute', bottom: '12px', right: '14px', backgroundColor: 'rgba(0,0,0,0.55)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '500' }}>
                {galleryIndex + 1} / {IMAGE_KEYS.length}
              </div>
              {/* Expand hint */}
              <div style={{ position: 'absolute', bottom: '12px', left: '14px', backgroundColor: 'rgba(0,0,0,0.45)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem' }}>
                Tap to expand
              </div>
              {/* Prev arrow */}
              <button
                onClick={(e) => { e.stopPropagation(); setGalleryIndex((galleryIndex - 1 + IMAGE_KEYS.length) % IMAGE_KEYS.length); }}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.45)', border: 'none', color: 'white', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Previous"
              >‹</button>
              {/* Next arrow */}
              <button
                onClick={(e) => { e.stopPropagation(); setGalleryIndex((galleryIndex + 1) % IMAGE_KEYS.length); }}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.45)', border: 'none', color: 'white', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Next"
              >›</button>
            </div>

            {/* Thumbnail strip */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {IMAGE_KEYS.map((key, i) => (
                <button
                  key={key}
                  onClick={() => setGalleryIndex(i)}
                  style={{
                    flexShrink: 0, width: '70px', height: '52px', padding: 0, border: 'none',
                    borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', position: 'relative',
                    outline: i === galleryIndex ? '2px solid #0e2949' : '2px solid transparent',
                    opacity: i === galleryIndex ? 1 : 0.65, transition: 'opacity 0.15s, outline 0.15s',
                  }}
                  aria-label={`View photo ${i + 1}`}
                >
                  <ListingImage
                    propertyId={PROPERTY_ID}
                    imageKey={key}
                    alt={`Thumbnail ${i + 1}`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Lightbox ── */}
        {lightboxOpen && (
          <div
            onClick={() => setLightboxOpen(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: '900px', padding: '0 16px' }}>
              <div style={{ position: 'relative', paddingBottom: '66.6%', backgroundColor: '#111' }}>
                <ListingImage
                  propertyId={PROPERTY_ID}
                  imageKey={IMAGE_KEYS[galleryIndex]}
                  alt={`Property photo ${galleryIndex + 1}`}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <button onClick={() => setGalleryIndex((galleryIndex - 1 + IMAGE_KEYS.length) % IMAGE_KEYS.length)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>
                  ‹ Prev
                </button>
                <span style={{ color: 'white', fontSize: '0.9rem' }}>{galleryIndex + 1} / {IMAGE_KEYS.length}</span>
                <button onClick={() => setGalleryIndex((galleryIndex + 1) % IMAGE_KEYS.length)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>
                  Next ›
                </button>
              </div>
            </div>
            <button onClick={() => setLightboxOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem' }}>
              ✕
            </button>
          </div>
        )}

        {/* ── More Than Just a 1-Bedroom + Why It Stands Out ── */}
        <section style={{ padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: 'white' }}>
          <div style={{
            maxWidth: '1100px', margin: '0 auto',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'clamp(32px, 6vw, 64px)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)', color: '#0e2949', margin: 0 }}>
                More Than Just a 1-Bedroom Condo
              </h2>
              <p style={{ color: '#4c5a6b', lineHeight: '1.7', margin: 0, fontSize: 'clamp(0.95rem, 2vw, 1.05rem)' }}>
                Most 1-bedroom units at One Regis offer around <strong>37 sqm</strong>. This <strong>50 sqm Upper Penthouse</strong> gives you approximately <strong>35% more living space</strong> on the highest residential floor.
              </p>
              <p style={{ color: '#4c5a6b', lineHeight: '1.7', margin: 0, fontSize: 'clamp(0.95rem, 2vw, 1.05rem)' }}>
                The generous living area can accommodate a home office, entertainment space, or an additional sleeping area. The bonus utility room serves as storage, a helper&apos;s room, walk-in pantry, or hobby room.
              </p>
              <p style={{ color: '#4c5a6b', lineHeight: '1.7', margin: 0, fontSize: 'clamp(0.95rem, 2vw, 1.05rem)' }}>
                Most one-bedroom units have only one bathroom — this unit includes <strong>two full bathrooms</strong>, adding everyday convenience for families, guests, or multiple occupants.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)', color: '#0e2949', margin: 0 }}>
                Why This Unit Stands Out
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {WHY_STANDS_OUT.map((item) => (
                  <div key={item} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold', flexShrink: 0, marginTop: '2px' }}>✓</span>
                    <span style={{ color: '#374151', lineHeight: '1.6', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Ideal For ── */}
        <section style={{ padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: '#f7fafc' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'clamp(24px, 5vw, 40px)' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', color: '#0e2949', margin: 0, textAlign: 'center' }}>
              Ideal For
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'clamp(10px, 2.5vw, 16px)' }}>
              {IDEAL_FOR.map((item) => (
                <div key={item} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 18px', backgroundColor: 'white',
                  borderRadius: '8px', borderLeft: '3px solid #0e2949',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <span style={{ color: '#0e2949', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 0.95rem)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Prime Location ── */}
        <section style={{ padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: 'white' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', color: '#0e2949', margin: 0 }}>
              Prime Location
            </h2>
            <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.1rem)', color: '#4c5a6b', lineHeight: '1.7', margin: 0 }}>
              Located within <strong>One Regis, Upper East Township</strong> — one of Bacolod City&apos;s most desirable communities.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
              {['Landers Superstore', "Lopue's East Centre", 'Bacolod City Government Center'].map((place) => (
                <span key={place} style={{
                  padding: '8px 16px', backgroundColor: '#f7fafc',
                  border: '1px solid #e2e8f0', borderRadius: '20px',
                  color: '#0e2949', fontWeight: '500', fontSize: 'clamp(0.85rem, 2vw, 0.9rem)',
                }}>
                  📍 {place}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1.05rem)', color: '#4c5a6b', lineHeight: '1.7', margin: 0 }}>
              Just minutes away from schools, hospitals, restaurants, cafés, business establishments, and major city destinations.
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{
          backgroundColor: '#0e2949', color: 'white',
          padding: 'clamp(48px, 8vw, 80px) clamp(16px, 4vw, 20px)',
        }}>
          <div style={{
            maxWidth: '1200px', margin: '0 auto',
            display: 'flex', flexDirection: 'column', gap: '40px',
            alignItems: 'center', textAlign: 'center',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: 0 }}>
                Interested in This Upper Penthouse?
              </h2>
              <p style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)', margin: 0, lineHeight: '1.6', opacity: 0.9 }}>
                Fill out the form and we&apos;ll send you the complete property details, including the asking price and additional photos. Ask questions, request more photos, or schedule a viewing.
              </p>
            </div>
            {formCard('Get Property Details')}
          </div>
        </section>

      </main>
    </>
  );
}
