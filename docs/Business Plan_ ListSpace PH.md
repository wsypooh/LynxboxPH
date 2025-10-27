# ListSpace PH

**"Helping Small Commercial Landlords Go Digital"**

---

### **Executive Summary**

ListSpace PH is a digital listing and rental management platform designed for small commercial property owners in the Philippines. It provides free property listings, rental invoicing, and tenant tools, with monetization through paid upgrades and subscriptions. Built with a modern tech stack and PH-localized features, it addresses the gap in platforms catering to individual commercial landlords.

---

### **Target Market**

* Small commercial landlords (offices, warehouses)

* Real estate brokers with mid-volume inventory

* SMEs and entrepreneurs looking for affordable rental spaces

---

### **Problem**

Most platforms target large developers or residential rentals. Small landlords lack tools to manage listings and tenants, often relying on Facebook or word-of-mouth.

---

### **Solution**

* Easy listing portal with map-based search

* Free rental invoicing and tenant tracking

* Premium listing upgrades for more visibility

* Multi-language support and PH-specific features

---

### **Revenue Streams**

* One-time fees (listing upgrades)

* Monthly subscriptions

* Ads (after scale)

* Partner referrals

---

### **Pricing & Cost Structure**

**Freemium (₱0)**

* 1 active listing

* 3 photos, 7-day duration

**Premium Add-ons (One-time Fees)**

* Featured placement: ₱500

* 30-day visibility: ₱300

* Photo gallery: ₱200

* Video tour: ₱1,000

**Subscription Plans (Monthly)**

* **Basic (₱0)**

* **Professional (₱1,490)**

  * 10 listings, analytics, receipts

* **Enterprise (₱4,990)**

  * Unlimited listings, API, support  
    

---

### **Marketing Plan**

**Initial Phase (0–1,000 users)**

* Join FB groups, reach out to small landlords

* Post sample listings to show traction

* Offer free invoicing tool as a hook

* Partner with real estate brokers

* Referral rewards for users who bring in landlords

**Growth Phase (1,000–10,000 users)**

* Facebook/Instagram Ads (landlords \+ renters)

* Attend SME/local business expos

* Content marketing: "How to rent out your space" guides

* Onboard local influencers to demo the product

* Partner with PH business directories or chambers

**Retention**

* Automated email nudges (renew listings)

* Monthly landlord tips

* Data reports (e.g., average rental price by area)

---

### **Development Roadmap**

**Phase 1: Core Platform (2–3 weeks)**

* Next.js setup, listing CRUD, authentication

**Phase 2: Payments (2 weeks)**

* Integrate PayMaya, GCash, PayPal

**Phase 3: Advanced Features (3–4 weeks)**

* Search enhancements, analytics, invoicing, auto-reminders

**Hosting**

* Start: Vercel, Supabase

* Scale: AWS SG / GCP Taiwan, PH cloud providers

**Compliance**

* PH Data Privacy Act

* VAT (12%) \+ withholding

* SEC business registration

### 

---

### **Tech Stack**

**Frontend**

* Next.js (Vercel hosting)

* Chakra UI (RTL support)

* next-i18next (multi-language)

* Mapbox GL JS (PH map data)

**Backend**

* Next.js API Routes

* Supabase (PostgreSQL)

* Meilisearch (self-hosted)

* NextAuth.js (Google SSO, email/password)

**Payments**

* PayMaya (Primary)

* GCash (Direct or via PayMaya)

* PayPal (International)

* Stripe (Backup)

**Localization**

* PHP (₱) currency

* PH address/phone format

* PH property types

* Multi-language (English)

---

### **Scaling Strategy**

| Users | Strategy |
| ----- | ----- |
| 0–1,000 MAU | Free tiers, manual outreach, low infra cost |
| 1,000–10,000 MAU | Upgrade to Vercel Pro, Supabase Pro, start paying for Mapbox |
| 10,000+ MAU | Shift to AWS/GCP, add microservices, caching, dedicated CDN |

---

### **Key Metrics**

* MAU (Landlords vs Renters)

* Listings posted/month

* Premium conversion rate

* Invoice usage

* Lead response time

