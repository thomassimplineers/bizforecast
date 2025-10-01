# BizForecast - Säljpipeline & Prognosverktyg

BizForecast är en modern webbapplikation byggd för att hjälpa säljteam att hantera sin säljpipeline, följa upp affärer och skapa träffsäkra prognoser. Applikationen är byggd med en modern tech-stack och är designad för att vara snabb, responsiv och användarvänlig.

## Funktioner

-   **Dashboard:** En översiktlig vy med nyckeltal (KPI:er) som total omsättning, förväntad omsättning och täckningsbidrag. Innehåller även grafer som visualiserar förväntad omsättning per månad och per försäljningskälla.
-   **Affärshantering:** En detaljerad tabellvy över alla affärer. Användare kan sortera, filtrera, redigera och ta bort affärer. Det går även att skapa nya affärer via ett formulär.
-   **AI-drivna Statusförslag:** När man redigerar en affär kan man använda en AI-funktion (byggd med Genkit) för att få ett intelligent förslag på nästa status för affären, baserat på historik och anteckningar.
-   **List-hantering:** Användare kan själva hantera listor för "Källor" (varifrån en affär kommer) och "Partners" (vilken partner som är involverad).

## Teknisk Stack

-   **Framework:** [Next.js](https://nextjs.org/) (med App Router)
-   **Språk:** [TypeScript](https://www.typescriptlang.org/)
-   **UI:** [React](https://react.dev/), [Shadcn UI](https://ui.shadcn.com/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Databas:** [Firebase Firestore](https://firebase.google.com/docs/firestore)
-   **AI-funktionalitet:** [Genkit](https://firebase.google.com/docs/genkit)
-   **Diagram:** [Recharts](https://recharts.org/)

## Komma Igång

För att köra applikationen lokalt behöver du följa dessa steg.

### Förutsättningar

-   [Node.js](https://nodejs.org/)
-   [Firebase CLI](https://firebase.google.com/docs/cli)

### 1. Installera Beroenden

Klona repot och installera alla nödvändiga paket.

```bash
npm install
```

### 2. Starta Firebase-emulatorer

Applikationen använder Firebase Firestore som databas. För lokal utveckling körs databasen i en emulator. Detta startar en lokal databasinstans med exempelfata.

Öppna en terminal och kör:

```bash
firebase emulators:start
```

### 3. Starta Utvecklingsservern

Öppna en **ny** terminal (lämna emulatorn körandes) och starta Next.js-applikationen.

```bash
npm run dev
```

Applikationen är nu tillgänglig på [http://localhost:9002](http://localhost:9002).

### Notering om Autentisering

För närvarande är autentiseringssystemet avaktiverat för att underlätta utveckling och testning. Applikationen simulerar en inloggad användare automatiskt, så du behöver inte skapa ett konto eller logga in.
