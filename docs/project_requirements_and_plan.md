# Commercial Property Listing Platform

## Project Overview
A commercial rental property listing platform similar to LoopNet, initially targeting the Philippine market with plans for international expansion.

## Key Requirements

### Core Features
- **Property Listings**: Freemium model with paid upgrades
- **User Management**: Google SSO authentication
- **Search & Discovery**: Advanced filters and map-based search
- **Monetization**: Multiple revenue streams

### Monetization Strategy
1. **Freemium Listings**
   - Free basic property listings
   - Basic rental invoicing
   - Limited photos and visibility

2. **Paid Upgrades**
   - Featured/priority spots
   - Extended visibility (30 days vs 7 days)
   - Media upgrades (videos, 3D tours)
   - Automated tools (reminders, receipts, tax reports)

3. **Subscription Tiers**
   - **Basic**: Free (limited listings)
   - **Professional**: ₱1,490/month (10+ listings, basic analytics)
   - **Enterprise**: ₱4,990/month (unlimited listings, advanced features)

4. **Additional Revenue**
   - Contextual/banner ads
   - Sponsored listings
   - Premium support services

## Technical Stack

### Frontend
- **Framework**: Next.js (hosted on Vercel)
- **UI Library**: Chakra UI
- **Maps**: Mapbox GL JS
- **Internationalization**: next-i18next

### Backend
- **Runtime**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Search**: Meilisearch
- **Authentication**: NextAuth.js (Google SSO)

### Payment Processing
- **Philippines**:
  - PayMaya
  - GCash
- **International**:
  - PayPal
  - Credit/Debit Cards (Stripe)

## Development Phases

### Phase 1: MVP (Weeks 1-4)
- Basic property listing functionality
- User authentication (Google SSO)
- Simple search and filters
- Basic user profiles

### Phase 2: Monetization (Weeks 5-8)
- Payment gateway integration (PayMaya, GCash, PayPal)
- Premium listing features
- Subscription management
- Basic analytics dashboard

### Phase 3: Advanced Features (Months 3-4)
- Advanced search with map integration
- 3D tours and virtual walkthroughs
- Automated invoicing and tax reports
- Multi-language support

## Localization (Philippines)
- Default currency: PHP (₱)
- Local address formats
- PH-specific property types
- Compliance with PH Data Privacy Act
- Local payment methods (GCash, PayMaya)

## Cost Structure

### Development & Hosting (Initial)
- **Frontend**: Vercel (Free tier)
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (Free tier)
- **Search**: Meilisearch (Self-hosted on Railway free tier)
- **Payments**: Pay-as-you-go with payment processors

### Scaling Considerations
- Start with serverless architecture
- Move to dedicated infrastructure as needed
- Implement caching strategies
- Consider local PH hosting for better latency

## Next Steps
1. Set up initial project structure
2. Implement authentication system
3. Create basic property listing functionality
4. Integrate with payment gateways
5. Deploy initial version for testing

---
*Document generated on: 2025-07-27*
*Version: 1.0*
