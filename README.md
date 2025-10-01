# BizForecast - Distributörs Marginal & Prognosverktyg

Ett modernt forecasting-verktyg för distributörer med fokus på marginalanalys och prognoser. Byggt med Next.js, TypeScript, Firebase och Shadcn UI.

## 🚀 Produktionsklar Applikation

**BizForecast är nu redo att användas som din lokala forecasting-applikation!**

### Snabbstart för Produktion

1. **Installera dependencies:**
   ```bash
   npm install
   ```

2. **Starta Firebase-emulatorer (terminal 1):**
   ```bash
   firebase emulators:start
   ```

3. **Initiera produktionsdata (terminal 2):**
   ```bash
   npm run init-production
   ```
   
   Detta skapar dina faktiska tillverkare och återförsäljare utan dummy-data.

4. **Starta applikationen:**
   ```bash
   npm run dev
   ```

5. **Börja använda:**
   Gå till [http://localhost:3000](http://localhost:3000) och börja lägga till dina riktiga affärer!

📖 **Läs [PRODUCTION-GUIDE.md](./PRODUCTION-GUIDE.md) för fullständig användarguide**

## Funktioner

- **Dashboard**: KPI:er och kategoriserad prognos (Committed/Best Case/Worst Case)
- **Affärshantering**: CRUD för affärer med BDM-fält och automatisk marginalberäkning
- **List-hantering**: Hantera tillverkare och återförsäljare
- **Prognosmotor**: Viktad marginal per månad som primär vy
- **Filtrering**: På status, tillverkare, återförsäljare, kategori

## Teknisk Stack

- **Framework**: Next.js 15 (App Router)
- **Språk**: TypeScript
- **UI**: React + Shadcn UI + Tailwind CSS
- **Databas**: Firebase Firestore (med emulatorer för lokal utveckling)
- **Diagram**: Recharts

## 💾 Datahantering

### Exportera din produktionsdata
```bash
npm run export-data
```
Sparar all din data till `./backup-data/` som följer med i git.

### Importera produktionsdata (efter git clone)
```bash
# 1. Starta emulatorn först
firebase emulators:start

# 2. I ny terminal, importera data
npm run import-data
```

### För utveckling med testdata

1. **Rensa databas:**
   ```bash
   npm run clear-db
   ```

2. **Seeda med testdata:**
   ```bash
   npm run seed
   ```
   
   Detta skapar 25 realistiska testaffärer för utveckling.

### För produktion

1. **Rensa och initiera:**
   ```bash
   npm run clear-db
   npm run init-production
   ```

## Användning

### Dashboard
- Visa KPI:er för total omsättning, bruttomarginal och viktad marginal
- Växla mellan marginal- och omsättningsvy i graferna
- Se månadsvis prognos och fördelning per tillverkare/återförsäljare

### Affärer
- Visa alla affärer i en tabell med filter och sök
- Skapa nya affärer med automatisk marginalberäkning
- Redigera och ta bort befintliga affärer
- Filtrera på status, tillverkare, återförsäljare

### Listor
- Hantera tillverkare och återförsäljare
- Lägg till, redigera och ta bort poster
- Används som referensdata i affärer

## Datamodell

### Affärer (Deals)
- Tillverkare, Återförsäljare, Slutkund
- Försäljningspris USD, Kostnad USD
- Automatiskt beräknad marginal (USD och %)
- Sannolikhet, Status, Förväntad stängningsmånad

### Beräkningar
- **Marginal USD**: `sellUSD - costUSD`
- **Marginal %**: `(sellUSD - costUSD) / sellUSD`
- **Viktad Marginal**: `marginUSD * probability`
- **Viktad Omsättning**: `sellUSD * probability`

## Utveckling

### Projektstruktur
```
src/
├── app/                 # Next.js App Router sidor
├── components/          # React-komponenter
├── lib/                # Utilities och helpers
│   ├── firebase.ts     # Firebase-konfiguration
│   ├── firestore.ts    # Firestore CRUD-operationer
│   └── calculations.ts # Marginal- och prognosberäkningar
├── types/              # TypeScript-typer
└── ...
```

### Viktiga Kommandon
```bash
npm run dev          # Starta utvecklingsserver
npm run build        # Bygg för produktion
npm run seed         # Seeda databasen med exempeldata
firebase emulators:start  # Starta Firebase-emulatorer
```

### Firebase Emulatorer
Projektet använder Firebase-emulatorer för lokal utveckling:
- Firestore: `localhost:8080`
- Firebase UI: `localhost:4000`

Data lagras lokalt och försvinner när emulatorn stoppas.

## Deployment

Projektet är förberett för deployment till Vercel:

1. Skapa Firebase-projekt i produktion
2. Konfigurera miljövariabler
3. Deploya till Vercel

Se `updated-plan.md` för detaljerad deployment-guide.

## Bidrag

1. Fork projektet
2. Skapa en feature branch
3. Commita dina ändringar
4. Pusha till branchen
5. Öppna en Pull Request

## Licens

Detta projekt är privat och ägs av distributörsföretaget.
