'use client';

import { useEffect } from 'react';

export default function ApplicationForm() {
  useEffect(() => {
    window.location.href = 'https://forms.zohopublic.com/adminlyn1/form/application/formperma/VDoLJKYOTBbwA1I0j8tPO5c9u51mwdpfiIHJ1taZdFI';
  }, []);

  return (
    <main style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0e2949',
      color: 'white',
      flexDirection: 'column',
      gap: '16px',
      fontFamily: 'sans-serif'
    }}>
      <img
        src="/lynxboxph-logo.png"
        alt="Lynxbox PH"
        style={{ width: '160px', objectFit: 'contain', marginBottom: '8px' }}
      />
      <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>Redirecting to application form...</p>
      <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>
        If you are not redirected,{' '}
        <a
          href="https://forms.zohopublic.com/adminlyn1/form/application/formperma/VDoLJKYOTBbwA1I0j8tPO5c9u51mwdpfiIHJ1taZdFI"
          style={{ color: '#93c5fd', textDecoration: 'underline' }}
        >
          click here
        </a>.
      </p>
    </main>
  );
}
