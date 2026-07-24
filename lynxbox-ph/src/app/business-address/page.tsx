'use client';

import { useState } from 'react';

export default function BusinessAddress() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState(false);

  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const phone = formData.get('phone') as string;
    const baseTags = ['business-address', 'inquiry'];
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      source: 'business-address',
      tags: phone ? [...baseTags, `phone:${phone}`] : baseTags
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToastMessage('Thank you for your inquiry! We will get back to you shortly.', 'success');
        (e.target as HTMLFormElement).reset();
      } else {
        showToastMessage(result.error || 'Failed to submit inquiry. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Inquiry error:', error);
      showToastMessage('Network error. Please try again later.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formBlock = (headingText: string) => (
    <form
      onSubmit={handleFormSubmit}
      style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: 'clamp(16px, 4vw, 24px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', fontWeight: '600', margin: 0 }}>
          {headingText}
        </h3>
        <p style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', opacity: 0.9, margin: 0 }}>
          We&apos;ll reach out to walk you through the details
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <input
            type="text"
            name="name"
            placeholder="Enter your name"
            required
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#0e2949',
              border: 'none',
              width: '100%',
              padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)',
              borderRadius: '8px',
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
            }}
          />
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            required
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#0e2949',
              border: 'none',
              width: '100%',
              padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)',
              borderRadius: '8px',
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
            }}
          />
          <input
            type="tel"
            name="phone"
            placeholder="Contact number (e.g. 09171234567)"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#0e2949',
              border: 'none',
              width: '100%',
              padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)',
              borderRadius: '8px',
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? '#9ca3af' : '#4c5a6b',
              color: 'white',
              width: '100%',
              padding: 'clamp(12px, 3vw, 14px)',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              border: 'none',
              fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)',
              fontWeight: '600',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#6b7280';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#4c5a6b';
            }}
          >
            {isLoading ? 'Sending...' : 'Inquire Now'}
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <>
      {showToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: toastType === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxWidth: '400px',
            fontSize: '14px',
            lineHeight: '1.5',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>
              {toastType === 'success' ? '✓' : '✕'}
            </span>
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
        {/* Hero Section */}
        <section
          style={{
            position: 'relative',
            backgroundColor: '#0e2949',
            color: 'white',
            padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 20px)',
            margin: 0,
            minHeight: '70vh',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 0, overflow: 'hidden'
            }}
          >
            <img
              src="/images/commercial-building.png"
              alt="The Building, Burgos Street, Bacolod City"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(14,41,73,0.9)',
              zIndex: 1
            }}
          />
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 clamp(16px, 4vw, 20px)',
              position: 'relative',
              zIndex: 2,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                maxWidth: '800px',
                width: '100%',
                gap: 'clamp(16px, 4vw, 24px)'
              }}
            >
              <img
                src="/lynxboxph-logo.png"
                alt="Lynxbox PH"
                style={{
                  width: 'clamp(150px, 40vw, 200px)',
                  height: 'clamp(75px, 20vw, 100px)',
                  objectFit: 'contain',
                  marginBottom: 'clamp(16px, 4vw, 24px)'
                }}
              />

              <h1 style={{
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 'bold',
                lineHeight: '1.2',
                margin: 0
              }}>
                Establish Your Business with a Professional Bacolod Address
              </h1>
              <p style={{
                fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)',
                maxWidth: '650px',
                lineHeight: '1.4',
                fontWeight: '500',
                margin: 0
              }}>
                Use Our Business Address for Permits, Registration, and Official Correspondence
              </p>
              <p style={{
                fontSize: 'clamp(0.95rem, 2vw, 1.2rem)',
                opacity: 0.95,
                maxWidth: '700px',
                lineHeight: '1.6',
                margin: 0
              }}>
                Starting a business but don&apos;t want to use your home address? Our Business Address Service gives
                entrepreneurs, freelancers, online sellers, consultants, and small businesses a professional
                Bacolod business address — without the cost of renting an office.
              </p>
              <p style={{
                fontSize: 'clamp(0.85rem, 1.8vw, 1rem)',
                opacity: 0.85,
                margin: 0
              }}>
                Located at <strong>The Building, Burgos Street, Bacolod City</strong>
              </p>

              {formBlock('Get Started Today')}
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: 'white' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#0e2949', margin: '0 0 clamp(16px, 4vw, 24px) 0' }}>
                Why Choose a Business Address Service?
              </h2>
              <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#4c5a6b', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
                Many business owners operate from home or work remotely. Using a dedicated business address can help you:
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'clamp(20px, 4vw, 32px)'
            }}>
              {[
                { icon: '🔒', title: 'Keep Your Home Address Private', desc: 'Keep your residential address off public regulatory registries and government records.' },
                { icon: '🏛️', title: 'Professional Business Image', desc: 'Present a credible corporate presence that commands trust from clients, banks, and authorities.' },
                { icon: '📬', title: 'Receive Official Correspondence', desc: 'Get important government and business mail from BIR, SEC, DTI, SSS, PhilHealth, and Pag-IBIG.' },
                { icon: '💼', title: 'Business Presence Without Office Rent', desc: 'Establish a legitimate business location without the overhead of leasing office space.' },
                { icon: '📋', title: 'Dedicated Location for Documents', desc: 'Have a secure, recognized address for official documents, permits, and regulatory filings.' },
              ].map((item) => (
                <div key={item.title} style={{
                  backgroundColor: 'white',
                  padding: 'clamp(20px, 4vw, 32px)',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: 'clamp(40px, 8vw, 48px)',
                    height: 'clamp(40px, 8vw, 48px)',
                    backgroundColor: '#0e2949',
                    borderRadius: '50%',
                    margin: '0 auto clamp(12px, 3vw, 16px) auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(18px, 4vw, 22px)'
                  }}>
                    {item.icon}
                  </div>
                  <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.1rem)', color: '#0e2949', margin: '0 0 clamp(8px, 2vw, 12px) 0' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: '#4c5a6b', lineHeight: '1.6', margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: '#f7fafc' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#0e2949', margin: '0 0 clamp(16px, 4vw, 24px) 0' }}>
                Services We Offer
              </h2>
              <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#4c5a6b', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                Everything you need to run a legitimate business in Bacolod City
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(24px, 5vw, 40px)' }}>
              {/* Service 1 */}
              <div style={{
                backgroundColor: 'white',
                padding: 'clamp(24px, 5vw, 40px)',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderTop: '4px solid #0e2949'
              }}>
                <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', color: '#0e2949', margin: '0 0 16px 0' }}>
                  🏢 Business Address Usage
                </h3>
                <p style={{ color: '#4c5a6b', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                  Use the The Building address for:
                </p>
                <ul style={{ color: '#4c5a6b', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                  <li>Business permit applications & renewals</li>
                  <li>DTI, SEC, and BIR registration</li>
                  <li>Mayor&apos;s Permit applications (BPLO-compliant)</li>
                  <li>Government and supplier correspondence</li>
                  <li>Official business communications</li>
                </ul>
              </div>

              {/* Service 2 */}
              <div style={{
                backgroundColor: 'white',
                padding: 'clamp(24px, 5vw, 40px)',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderTop: '4px solid #0e2949'
              }}>
                <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', color: '#0e2949', margin: '0 0 16px 0' }}>
                  📬 Mail Receiving & Instant Notifications
                </h3>
                <p style={{ color: '#4c5a6b', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                  Never miss an important notice from the BIR or local government. When mail arrives, we:
                </p>
                <ul style={{ color: '#4c5a6b', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                  <li>Receive and log your documents in real-time</li>
                  <li>Notify you promptly via email, Viber, or Messenger</li>
                  <li>Securely store documents until pickup</li>
                </ul>
              </div>

              {/* Service 3 */}
              <div style={{
                backgroundColor: 'white',
                padding: 'clamp(24px, 5vw, 40px)',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderTop: '4px solid #0e2949'
              }}>
                <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', color: '#0e2949', margin: '0 0 16px 0' }}>
                  🔐 Secure Document Handling
                </h3>
                <p style={{ color: '#4c5a6b', lineHeight: '1.6', margin: 0 }}>
                  Your important business documents are handled professionally and kept secure in a
                  restricted-access area until collected. On-site staff is available during business hours
                  to accept couriers and official deliveries on your behalf.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Perfect For Section */}
        <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: 'white' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#0e2949', margin: '0 0 clamp(16px, 4vw, 16px) 0' }}>
                Perfect For
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'clamp(16px, 3vw, 24px)' }}>
              {[
                { icon: '🏠', label: 'Home-based Businesses & E-commerce Stores' },
                { icon: '💻', label: 'Freelancers, Consultants & Digital Agencies' },
                { icon: '🏡', label: 'Real Estate Professionals' },
                { icon: '🛡️', label: 'Insurance Agents' },
                { icon: '🚀', label: 'Startups & MSMEs' },
                { icon: '🛒', label: 'Online Sellers' },
                { icon: '🏢', label: 'Small Business Owners' },
                { icon: '📊', label: 'Growing Entrepreneurs' },
              ].map((item) => (
                <div key={item.label} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: 'clamp(12px, 3vw, 16px) clamp(16px, 4vw, 20px)',
                  backgroundColor: '#f7fafc',
                  borderRadius: '8px',
                  borderLeft: '3px solid #0e2949'
                }}>
                  <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ color: '#0e2949', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: '#f7fafc' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#0e2949', margin: '0 0 clamp(16px, 4vw, 16px) 0' }}>
                How It Works
              </h2>
              <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: '#4c5a6b', margin: 0 }}>
                Simple. Professional. Affordable.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'clamp(24px, 5vw, 32px)' }}>
              {[
                {
                  step: '1',
                  title: 'Sign Up & Secure Documents',
                  desc: 'Choose your plan and receive the lease agreement and consent documents needed for your business registration.'
                },
                {
                  step: '2',
                  title: 'Register Your Business',
                  desc: 'Use our Burgos Street address on your DTI, SEC, BIR, and Mayor\'s Permit application forms.'
                },
                {
                  step: '3',
                  title: 'We Receive Your Mail',
                  desc: 'Our on-site staff safely accepts your official correspondence and packages during business hours.'
                },
                {
                  step: '4',
                  title: 'Get Notified & Collect',
                  desc: 'Receive an instant alert via email or messaging app and pick up your documents at your convenience.'
                }
              ].map((item) => (
                <div key={item.step} style={{ display: 'flex', gap: 'clamp(12px, 3vw, 16px)', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 'clamp(36px, 8vw, 44px)',
                    height: 'clamp(36px, 8vw, 44px)',
                    backgroundColor: '#0e2949',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: '600', color: '#0e2949', margin: '0 0 8px 0', fontSize: 'clamp(1rem, 2.5vw, 1.1rem)' }}>
                      {item.title}
                    </h4>
                    <p style={{ color: '#4c5a6b', lineHeight: '1.6', margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why The Building */}
        <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: 'white' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#0e2949', margin: 0 }}>
              Why The Building?
            </h2>
            <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.15rem)', color: '#4c5a6b', lineHeight: '1.7', margin: 0 }}>
              Burgos Street is one of Bacolod City&apos;s primary commercial arteries. By placing your business here,
              you gain a recognized address that commands trust from local authorities, banks, and clients alike.
            </p>
            <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.15rem)', color: '#4c5a6b', lineHeight: '1.7', margin: 0 }}>
              With reliable on-site staff available every business day, you never have to worry about missed couriers
              or lost government notices. Your documents are received, logged, and stored securely until you&apos;re ready to collect.
            </p>
          </div>
        </section>

        {/* Pricing Section */}
        <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: '#f7fafc' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#0e2949', margin: '0 0 12px 0' }}>
                Simple Plans for Your Business Address Needs
              </h2>
              <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.1rem)', color: '#4c5a6b', margin: 0 }}>
                Choose the plan that fits your business stage.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(24px, 4vw, 32px)' }}>
              {/* Plan 1 */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ backgroundColor: '#4c5a6b', color: 'white', padding: 'clamp(20px, 4vw, 28px)', textAlign: 'center' }}>
                  <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.1rem)', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>
                    BASIC ACCESS
                  </h3>
                  <div style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', fontWeight: 'bold', margin: '8px 0 4px 0' }}>₱499</div>
                  <div style={{ opacity: 0.85, fontSize: '0.9rem' }}>per month</div>
                  <p style={{ opacity: 0.9, fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', margin: '12px 0 0 0' }}>
                    For simple business correspondence only.
                  </p>
                </div>
                <div style={{ padding: 'clamp(20px, 4vw, 28px)', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { check: true, text: 'Business address for receiving mail' },
                    { check: true, text: 'Email notifications on mail arrival' },
                    { check: true, text: 'Secure mail storage (7 days)' },
                    { check: false, text: 'Not for business registration or permits' },
                    { check: false, text: 'No authorization letter included' },
                    { check: false, text: 'No document scanning' },
                  ].map((f) => (
                    <div key={f.text} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ color: f.check ? '#10b981' : '#9ca3af', flexShrink: 0, marginTop: '2px' }}>
                        {f.check ? '✓' : '✕'}
                      </span>
                      <span style={{ color: f.check ? '#374151' : '#9ca3af', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: '1.5' }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan 2 - Most Popular */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(14,41,73,0.2)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transform: 'scale(1.02)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '12px', right: '12px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  letterSpacing: '0.05em'
                }}>
                  MOST POPULAR
                </div>
                <div style={{ backgroundColor: '#0e2949', color: 'white', padding: 'clamp(20px, 4vw, 28px)', textAlign: 'center' }}>
                  <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.1rem)', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>
                    BUSINESS ADDRESS
                  </h3>
                  <div style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', fontWeight: 'bold', margin: '8px 0 4px 0' }}>₱999</div>
                  <div style={{ opacity: 0.85, fontSize: '0.9rem' }}>per month</div>
                  <p style={{ opacity: 0.9, fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', margin: '12px 0 0 0' }}>
                    The standard choice for small businesses in Bacolod.
                  </p>
                </div>
                <div style={{ padding: 'clamp(20px, 4vw, 28px)', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    'Use for DTI, Mayor\'s Permit, and business registration',
                    'Professional business address in Bacolod',
                    'Mail receiving and real-time notifications',
                    'Secure document storage (up to 90 days)',
                    'Authorization letter for registration use',
                    'Local support team assistance',
                    'Provision of lease contract/documents for BPLO',
                  ].map((f) => (
                    <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }}>✓</span>
                      <span style={{ color: '#374151', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: '1.5' }}>{f}</span>
                    </div>
                  ))}
                  <p style={{ color: '#0e2949', fontWeight: '600', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                    Recommended for most businesses
                  </p>
                </div>
              </div>

              {/* Plan 3 */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ backgroundColor: '#1e3a5f', color: 'white', padding: 'clamp(20px, 4vw, 28px)', textAlign: 'center' }}>
                  <h3 style={{ fontSize: 'clamp(1rem, 2.5vw, 1.1rem)', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>
                    BUSINESS COMPLIANCE
                  </h3>
                  <div style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', fontWeight: 'bold', margin: '8px 0 4px 0' }}>₱9,990</div>
                  <div style={{ opacity: 0.85, fontSize: '0.9rem' }}>per year</div>
                  <p style={{ opacity: 0.9, fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', margin: '12px 0 0 0' }}>
                    Best value for established and growing businesses.
                  </p>
                </div>
                <div style={{ padding: 'clamp(20px, 4vw, 28px)', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    'Everything in the Business Address plan',
                    'Save 2 months with annual billing',
                    'Priority handling of government and official mail',
                    'Fast notification for important documents',
                    'Monthly document scanning allowance',
                    'Priority support',
                    'Locked-in address stability for annual permit renewals',
                  ].map((f) => (
                    <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }}>✓</span>
                      <span style={{ color: '#374151', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', lineHeight: '1.5' }}>{f}</span>
                    </div>
                  ))}
                  <p style={{ color: '#0e2949', fontWeight: '600', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                    Best choice for serious business owners
                  </p>
                </div>
              </div>
            </div>

            <p style={{ textAlign: 'center', color: '#4c5a6b', fontSize: 'clamp(0.9rem, 2vw, 1rem)', margin: 0 }}>
              Not sure which plan to choose? Start with the <strong>Business Address</strong> plan. You can upgrade anytime as your business grows.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          backgroundColor: '#0e2949',
          color: 'white',
          padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 20px)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '48px',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: 0 }}>
                Ready to Establish Your Business Presence?
              </h2>
              <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                Get a professional Bacolod business address without the expense of leasing office space.
              </p>
              <p style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', opacity: 0.8, margin: 0 }}>
                Contact us today to learn more about our Business Address &amp; Mail Handling Service.
              </p>
            </div>

            {formBlock('Get in Touch')}
          </div>
        </section>
      </main>
    </>
  );
}
