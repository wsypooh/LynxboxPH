'use client';

import { useState } from 'react';

export default function Landlord() {
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
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      source: formData.get('source') as string,
      tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : undefined
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
        showToastMessage('Successfully joined the waiting list! Check your email for confirmation.', 'success');
        (e.target as HTMLFormElement).reset();
      } else {
        showToastMessage(result.error || 'Failed to join waiting list. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Signup error:', error);
      showToastMessage('Network error. Please try again later.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

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
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      <main style={{ margin: 0, padding: 0 }}>
      {/* Version marker for cache busting */}
      <div style={{ display: 'none' }} data-version="2024-01-26-04-00" />
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
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            overflow: 'hidden'
          }}
        >
          <img
            src="/images/commercial-building.png"
            alt="Modern office building"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
              margin: 0,
              maxWidth: '800px',
              width: '100%',
              justifyContent: 'center',
              gap: 'clamp(16px, 4vw, 24px)'
            }}
          >
            {/* Logo */}
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
              Lynxbox PH
            </h1>
            <p style={{ 
              fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', 
              maxWidth: '600px', 
              lineHeight: '1.4', 
              fontWeight: '500',
              margin: 0 
            }}>
              Smarter Property Management for Philippine Business Owners
            </p>
            <p style={{ 
              fontSize: 'clamp(1rem, 2vw, 1.3rem)', 
              opacity: 0.95, 
              maxWidth: '700px', 
              lineHeight: '1.6',
              margin: 0 
            }}>
              List, manage, and monitor your rental properties in one simple platform — built for small commercial landlords in the Philippines.
            </p>
            
            {/* Waiting List Signup - React Form */}
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
                  Be the First to Access Lynxbox PH
                </h3>
                <p style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', opacity: 0.9, margin: 0 }}>
                  Join our waiting list for exclusive early access
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
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter your email"
                      required
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        color: '#0e2949',
                        border: 'none',
                        flex: 1,
                        padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)',
                        borderRadius: '8px',
                        fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
                      }}
                    />
                    <input type="hidden" name="source" value="landlord" />
                    <input type="hidden" name="tags" value='["early-access", "waiting-list"]' />
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        backgroundColor: isLoading ? '#9ca3af' : '#4c5a6b',
                        color: 'white',
                        padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px)',
                        borderRadius: '8px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        border: 'none',
                        fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        opacity: isLoading ? 0.7 : 1,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = '#6b7280';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoading) {
                          e.currentTarget.style.backgroundColor = '#4c5a6b';
                        }
                      }}
                    >
                      {isLoading ? 'Joining...' : 'Join'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: 'white' }}>
        <div 
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '48px'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ 
              fontSize: 'clamp(1.5rem, 4vw, 2rem)', 
              color: '#0e2949', 
              margin: '0 0 clamp(16px, 4vw, 24px) 0' 
            }}>
              What is Lynxbox PH?
            </h2>
            <p style={{ 
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', 
              color: '#4c5a6b', 
              maxWidth: '800px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              Lynxbox PH helps small commercial landlords in the Philippines list, manage, and track their rental properties in one simple platform.
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: 'clamp(20px, 4vw, 32px)' 
          }}>
            {/* Feature 1 */}
            <div style={{ 
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
                color: 'white',
                fontSize: 'clamp(18px, 4vw, 24px)',
                fontWeight: 'bold'
              }}>
                🏢
              </div>
              <h3 style={{ 
                fontSize: 'clamp(1.1rem, 3vw, 1.2rem)', 
                color: '#0e2949', 
                margin: '0 0 clamp(8px, 2vw, 12px) 0' 
              }}>
                Easy Listings
              </h3>
              <p style={{ color: '#4c5a6b', lineHeight: '1.6', margin: 0 }}>
                Create professional property listings with photos, descriptions, and location details — all in one place
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{ 
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
                color: 'white',
                fontSize: 'clamp(18px, 4vw, 24px)',
                fontWeight: 'bold'
              }}>
                🔍
              </div>
              <h3 style={{ 
                fontSize: 'clamp(1.1rem, 3vw, 1.2rem)', 
                color: '#0e2949', 
                margin: '0 0 clamp(8px, 2vw, 12px) 0' 
              }}>
                Smart Search
              </h3>
              <p style={{ color: '#4c5a6b', lineHeight: '1.6', margin: 0 }}>
                Help tenants find the right space faster with smart filters for price, location, and property type
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{ 
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
                color: 'white',
                fontSize: 'clamp(18px, 4vw, 24px)',
                fontWeight: 'bold'
              }}>
                📄
              </div>
              <h3 style={{ 
                fontSize: 'clamp(1.1rem, 3vw, 1.2rem)', 
                color: '#0e2949', 
                margin: '0 0 clamp(8px, 2vw, 12px) 0' 
              }}>
                Invoicing Tools
              </h3>
              <p style={{ color: '#4c5a6b', lineHeight: '1.6', margin: 0 }}>
                Generate professional invoices, track payments, and stay on top of your rental income with ease
              </p>
            </div>

            {/* Feature 4 */}
            <div style={{ 
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
                color: 'white',
                fontSize: 'clamp(18px, 4vw, 24px)',
                fontWeight: 'bold'
              }}>
                👥
              </div>
              <h3 style={{ 
                fontSize: 'clamp(1.1rem, 3vw, 1.2rem)', 
                color: '#0e2949', 
                margin: '0 0 clamp(8px, 2vw, 12px) 0' 
              }}>
                Tenant Management
              </h3>
              <p style={{ color: '#4c5a6b', lineHeight: '1.6', margin: 0 }}>
                Store tenant information, manage lease agreements, and keep communication organized in one dashboard
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 20px)', backgroundColor: '#f7fafc' }}>
        <div 
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '48px'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ 
              fontSize: 'clamp(1.5rem, 4vw, 2rem)', 
              color: '#0e2949', 
              margin: '0 0 clamp(16px, 4vw, 24px) 0' 
            }}>
              Why Choose Lynxbox PH?
            </h2>
            <p style={{ 
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', 
              color: '#4c5a6b', 
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              Built to simplify everyday property management for small commercial landlords in the Philippines
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: 'clamp(24px, 5vw, 32px)',
            width: '100%'
          }}>
            <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 12px)', alignItems: 'flex-start' }}>
              <div style={{ 
                color: '#0e2949', 
                fontSize: 'clamp(16px, 4vw, 20px)',
                marginTop: '2px',
                flexShrink: 0
              }}>
                ✓
              </div>
              <div>
                <h4 style={{ 
                  fontWeight: '600', 
                  color: '#0e2949', 
                  margin: '0 0 clamp(6px, 1.5vw, 8px) 0',
                  fontSize: 'clamp(1rem, 2.5vw, 1.1rem)'
                }}>
                  Digital-First, Simple by Design
                </h4>
                <p style={{ 
                  color: '#4c5a6b', 
                  lineHeight: '1.6', 
                  margin: 0 
                }}>
                  Turn traditional property management into a simple digital workflow
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 12px)', alignItems: 'flex-start' }}>
              <div style={{ 
                color: '#0e2949', 
                fontSize: 'clamp(16px, 4vw, 20px)',
                marginTop: '2px',
                flexShrink: 0
              }}>
                ✓
              </div>
              <div>
                <h4 style={{ 
                  fontWeight: '600', 
                  color: '#0e2949', 
                  margin: '0 0 clamp(6px, 1.5vw, 8px) 0',
                  fontSize: 'clamp(1rem, 2.5vw, 1.1rem)'
                }}>
                  Property Insights That Matter
                </h4>
                <p style={{ 
                  color: '#4c5a6b', 
                  lineHeight: '1.6', 
                  margin: 0 
                }}>
                  Monitor occupancy, rental income, and property performance with easy-to-understand dashboards
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 12px)', alignItems: 'flex-start' }}>
              <div style={{ 
                color: '#0e2949', 
                fontSize: 'clamp(16px, 4vw, 20px)',
                marginTop: '2px',
                flexShrink: 0
              }}>
                ✓
              </div>
              <div>
                <h4 style={{ 
                  fontWeight: '600', 
                  color: '#0e2949', 
                  margin: '0 0 clamp(6px, 1.5vw, 8px) 0',
                  fontSize: 'clamp(1rem, 2.5vw, 1.1rem)'
                }}>
                  Automated Invoicing & Payment Tracking
                </h4>
                <p style={{ 
                  color: '#4c5a6b', 
                  lineHeight: '1.6', 
                  margin: 0 
                }}>
                  Create professional invoices, send them to tenants, and track payments — all in one place
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 12px)', alignItems: 'flex-start' }}>
              <div style={{ 
                color: '#0e2949', 
                fontSize: 'clamp(16px, 4vw, 20px)',
                marginTop: '2px',
                flexShrink: 0
              }}>
                ✓
              </div>
              <div>
                <h4 style={{ 
                  fontWeight: '600', 
                  color: '#0e2949', 
                  margin: '0 0 clamp(6px, 1.5vw, 8px) 0',
                  fontSize: 'clamp(1rem, 2.5vw, 1.1rem)'
                }}>
                  Manage Anywhere, Anytime
                </h4>
                <p style={{ 
                  color: '#4c5a6b', 
                  lineHeight: '1.6', 
                  margin: 0 
                }}>
                  Access and manage your properties from any device, whether you’re at home, in the office, or on the go
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ 
        backgroundColor: '#0e2949', 
        color: 'white', 
        padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 20px)' 
      }}>
        <div 
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '48px',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', margin: 0 }}>
              Ready to Manage Your Properties the Smarter Way?
            </h2>
            <p style={{ 
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', 
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              Be among the first to access Lynxbox PH
            </p>
            <p style={{ 
              fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', 
              opacity: 0.8,
              margin: 0 
            }}>
              Launching soon. Join the waiting list for early access
            </p>
          </div>
          
          {/* Waiting List Signup - Bottom - React Form */}
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
                Be the First to Access Lynxbox PH
              </h3>
              <p style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', opacity: 0.9, margin: 0 }}>
                Join our waiting list for exclusive early access
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
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    required
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      color: '#0e2949',
                      border: 'none',
                      flex: 1,
                      padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)',
                      borderRadius: '8px',
                      fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
                    }}
                  />
                  <input type="hidden" name="source" value="landlord" />
                  <input type="hidden" name="tags" value='["early-access", "waiting-list"]' />
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      backgroundColor: isLoading ? '#9ca3af' : '#4c5a6b',
                      color: 'white',
                      padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px)',
                      borderRadius: '8px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      border: 'none',
                      fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      opacity: isLoading ? 0.7 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.backgroundColor = '#6b7280';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.backgroundColor = '#4c5a6b';
                      }
                    }}
                  >
                    {isLoading ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  </>
)
}
