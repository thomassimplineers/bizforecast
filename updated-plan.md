# BizForecast - Distributörs Marginal & Prognosverktyg

BizForecast är en modern webbapplikation byggd för distributörer som behöver hantera sin säljpipeline och skapa träffsäkra marginalrognoser. Applikationen är designad för distributörsflödet: produkter från tillverkare, via återförsäljare, till slutkunder - med fokus på marginalanalys i USD.

## Affärsmodell & Dataflöde

**Distributörsflöde:**
- **Tillverkare** (Palo Alto, Extreme Networks, F5, etc.) → **Distributör (Du)** → **Återförsäljare** (Dustin, Netnordic, ATEA, etc.) → **Slutkund**
- **Prissättning:** Allt mäts i USD
- **Marginalberäkning:** 
  - Margin USD = Sell Price - Cost Price
  - Margin % = (Sell Price - Cost Price) / Sell Price
- **Prognosfokus:** Viktad marginal per månad som primär vy

## MVP-Funktioner

### 1. Dashboard (`/`)
**KPI-kort:**
- Total Revenue (USD) - summa av alla sell prices
- Total Cost (USD) - summa av alla cost prices  
- Gross Margin (USD) - total revenue minus total cost
- Gross Margin (%) - genomsnittlig marginalprocent

**Grafer:**
- Linjediagram: Viktad marginal per månad (12 månader framåt)
- Stapeldiagram: Viktad marginal per tillverkare
- Stapeldiagram: Viktad marginal per återförsäljare
- Toggle: Växla mellan marginal- och omsättningsvy

### 2. Affärshantering (`/deals`)
**Tabellvy med kolumner:**
- Manufacturer (tillverkare)
- Reseller (återförsäljare) 
- End Customer (slutkund)
- Sell USD (vad återförsäljaren betalar dig)
- Cost USD (vad du betalar tillverkaren)
- Margin USD (beräknat: sell - cost)
- Margin % (beräknat: (sell - cost) / sell)
- Probability (sannolikhet 0-100%)
- Expected Close (YYYY-MM)
- Status (prospect/qualified/proposal/verbal/won/lost)

**Funktioner:**
- CRUD: Skapa, redigera, ta bort affärer
- Sortering och filtrering på alla kolumner
- Snabbfilter: Tidsperiod, tillverkare, återförsäljare, status
- Automatisk marginalberäkning i formulär

### 3. List-hantering (`/lists`)
**Hantera referensdata:**
- **Manufacturers:** CRUD för tillverkare (Palo Alto, Extreme Networks, F5, etc.)
- **Resellers:** CRUD för återförsäljare (Dustin, Netnordic, ATEA, etc.)
- End Customers: Fri text i MVP (egen lista senare vid behov)

### 4. Prognosmotor v1
**Beräkningslogik:**
- **Viktad marginal per månad:** För varje öppen affär (ej won/lost), lägg till `marginUSD * probability` i bucket för `expectedCloseMonth`
- **Alternativ vy:** Viktad omsättning (`sellUSD * probability`)
- **Pivottabeller:** Aggregering per tillverkare och per återförsäljare
- **Tidshorisont:** 12 månader framåt som standard

## Teknisk Stack

- **Framework:** Next.js 14+ (App Router)
- **Språk:** TypeScript
- **UI:** React + Shadcn UI
- **Styling:** Tailwind CSS
- **Databas:** Firebase Firestore
- **Diagram:** Recharts
- **Utveckling:** Firebase Emulators för lokal utveckling
- **Autentisering:** Mockad användare i dev (enkel implementering senare)

## Datamodell (Firestore)

### Collection: `manufacturers`
```typescript
{
  id: string,
  name: string, // "Palo Alto Networks", "Extreme Networks", "F5", etc.
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Collection: `resellers`
```typescript
{
  id: string,
  name: string, // "Dustin", "Netnordic", "ATEA", etc.
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Collection: `deals`
```typescript
{
  id: string,
  manufacturerId: string, // referens till manufacturers
  resellerId: string, // referens till resellers
  endCustomer: string, // fri text i MVP
  sellUSD: number, // vad återförsäljaren betalar dig
  costUSD: number, // vad du betalar tillverkaren
  marginUSD: number, // beräknat och lagrat: sellUSD - costUSD
  marginPct: number, // beräknat och lagrat: (sellUSD - costUSD) / sellUSD
  probability: number, // 0.0 - 1.0
  status: "prospect" | "qualified" | "proposal" | "verbal" | "won" | "lost",
  expectedCloseMonth: string, // format "YYYY-MM"
  notes?: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Beräkningar & Validering

### Marginalberäkningar
```typescript
// Grundläggande beräkningar
marginUSD = sellUSD - costUSD
marginPct = (sellUSD - costUSD) / sellUSD

// Viktad marginal för prognos
weightedMarginUSD = marginUSD * probability
weightedRevenueUSD = sellUSD * probability
```

### Valideringsregler
- `sellUSD >= 0` och `costUSD >= 0`
- Varning (ej blockering) om `sellUSD < costUSD` (negativ marginal)
- `0 <= probability <= 1`
- `expectedCloseMonth` i format "YYYY-MM"
- Obligatoriska fält: manufacturer, reseller, sellUSD, costUSD, probability, expectedCloseMonth

### Prognosberäkningar
```typescript
// Månadsvis prognos
monthlyForecast = deals
  .filter(deal => deal.status !== 'won' && deal.status !== 'lost')
  .groupBy(deal => deal.expectedCloseMonth)
  .map(group => ({
    month: group.key,
    weightedMarginUSD: sum(group.deals.map(d => d.marginUSD * d.probability)),
    weightedRevenueUSD: sum(group.deals.map(d => d.sellUSD * d.probability))
  }))
```

## UX-Wireframes (Textbeskrivning)

### Dashboard
```
[KPI-kort: Revenue] [KPI-kort: Cost] [KPI-kort: GM USD] [KPI-kort: GM %]

[Linjediagram: Viktad marginal per månad - 12 månader]
[Toggle: Marginal/Revenue view]

[Stapeldiagram: Per tillverkare] [Stapeldiagram: Per återförsäljare]
```

### Affärer
```
[Sök] [Filter: Period▼] [Filter: Manufacturer▼] [Filter: Reseller▼] [+ Ny Affär]

| Manufacturer | Reseller | End Customer | Sell USD | Cost USD | Margin USD | Margin % | Prob | Close | Status | Actions |
|--------------|----------|--------------|----------|----------|------------|----------|------|-------|--------|---------|
| Palo Alto    | Dustin   | Volvo AB     | $50,000  | $35,000  | $15,000    | 30%      | 75%  | 2024-03| Proposal| [Edit][Del] |
```

### Listor
```
[Tab: Manufacturers] [Tab: Resellers]

Manufacturers:
[+ Lägg till tillverkare]
| Name              | Actions     |
|-------------------|-------------|
| Palo Alto Networks| [Edit][Del] |
| Extreme Networks  | [Edit][Del] |
| F5                | [Edit][Del] |
```

## Utvecklingsplan

### Fas 1: Grundläggande MVP
1. ✅ Initiera Next.js + TypeScript + Tailwind + Shadcn UI
2. ✅ Konfigurera Firebase + Firestore emulatorer
3. ✅ Skapa grundläggande sidor och routing
4. ✅ Implementera CRUD för manufacturers och resellers
5. ✅ Implementera CRUD för deals med marginalberäkningar
6. ✅ Skapa dashboard med KPI:er och grundläggande grafer
7. ✅ Seed-script med exempeldata

### Fas 2: Förbättringar
- CSV import/export för affärer
- Avancerade filter och sök
- Historisk analys och trender
- Notifikationer för affärer som närmar sig stängningsdatum
- Bulk-operationer på affärer

### Fas 3: Skalning
- Användarhantering och behörigheter
- API för integration med CRM/ERP
- Avancerad prognosmodell med ML
- Mobiloptimering
- Deployment till produktion

## Komma Igång

### Förutsättningar
- Node.js 18+
- Firebase CLI
- Git

### Installation
```bash
# Klona och installera
npm install

# Starta Firebase emulatorer (terminal 1)
firebase emulators:start

# Starta utvecklingsserver (terminal 2)
npm run dev
```

Applikationen körs på `http://localhost:3000` (eller annan port som Next.js väljer).

### Exempeldata
Seed-scriptet skapar automatiskt:
- **Manufacturers:** Palo Alto Networks, Extreme Networks, F5, Cisco, Fortinet
- **Resellers:** Dustin, Netnordic, ATEA, Ingram Micro, Tech Data
- **Deals:** 15-20 exempelaffärer med realistiska USD-belopp och marginaler

## Tekniska Beslut & Motivering

### Varför Firestore?
- Snabb utveckling med Firebase emulatorer
- Bra skalbarhet för framtida behov
- Inbyggd realtidssynkronisering
- Enkel deployment

### Varför Next.js App Router?
- Modern React-patterns
- Inbyggd optimering och SEO
- Enkel deployment till Vercel/Netlify
- TypeScript-first approach

### Varför fokus på viktad marginal?
- Mer relevant för distributörer än bara omsättning
- Tar hänsyn till sannolikhet för realistiska prognoser
- Enkelt att förklara för affärsanvändare

## Framtida Förbättringar

### Kort sikt (1-3 månader)
- Historisk data och trendanalys
- Avancerade filter (datumintervall, flerval)
- Export till Excel/CSV
- Notifikationer och påminnelser

### Medellång sikt (3-6 månader)
- Användarroller och behörigheter
- Integration med befintliga CRM/ERP-system
- Mobilapp eller responsiv design
- Automatisk dataimport från externa källor

### Lång sikt (6+ månader)
- Maskininlärning för förbättrade prognoser
- Avancerad rapportering och analytics
- Multi-tenant arkitektur
- API för tredjepartsintegrationer
