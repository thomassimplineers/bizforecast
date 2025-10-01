# BizForecast - Produktionsguide

Din BizForecast-applikation är nu redo för produktion! Här är allt du behöver veta för att komma igång.

## 🚀 Snabbstart

### 1. Starta applikationen
```bash
# Terminal 1: Starta Firebase-emulatorer
firebase emulators:start

# Terminal 2: Starta utvecklingsservern
npm run dev
```

### 2. Öppna applikationen
Gå till [http://localhost:3000](http://localhost:3000)

## 📊 Så använder du BizForecast

### Dashboard
- **KPI-översikt**: Se total omsättning, bruttomarginal och viktad marginal
- **Kategoriserad prognos**: Committed, Best Case, Worst Case
- **Månadsvis prognos**: Viktad marginal per månad
- **Fördelning**: Per tillverkare och återförsäljare
- **Växla vy**: Mellan marginal och omsättning

### Affärer
- **Skapa nya affärer**: Klicka "Ny Affär"
- **Redigera**: Klicka på Edit-ikonen
- **Ta bort**: Klicka på Trash-ikonen
- **Filtrera**: På status, tillverkare, återförsäljare, kategori
- **Sök**: I slutkund eller anteckningar

### Listor
- **Hantera tillverkare**: Lägg till, redigera, ta bort
- **Hantera återförsäljare**: Lägg till, redigera, ta bort
- **Snabbtillägg**: Från Affärer-sidan

## 💡 Tips för bästa resultat

### Affärshantering
1. **Fyll i alla obligatoriska fält**: Tillverkare, återförsäljare, slutkund, priser
2. **Sätt realistiska sannolikheter**: 10-30% för prospekt, 80-95% för muntliga
3. **Uppdatera status regelbundet**: För korrekt kategorisering
4. **Använd BDM-fältet**: För att spåra ansvarig person
5. **Lägg till anteckningar**: För viktig kontextinformation

### Prognoser
- **Committed**: Vunna affärer och muntliga med >80% sannolikhet
- **Best Case**: Förslag och affärer med >70% sannolikhet  
- **Worst Case**: Tidiga stadier och lägre sannolikhet

### Marginalberäkningar
- **Marginal USD**: Försäljningspris - Kostnad
- **Marginal %**: (Försäljningspris - Kostnad) / Försäljningspris
- **Viktad marginal**: Marginal × Sannolikhet

## 🔧 Underhåll

### Backup av data
Firebase-emulatorn sparar data lokalt. För backup:
1. Exportera data från Firebase UI (localhost:4000)
2. Eller använd Firebase CLI: `firebase emulators:export backup/`

### Rensa data
```bash
npm run clear-db  # Tar bort all data
npm run init-production  # Återställer tillverkare och återförsäljare
```

### Lägg till nya tillverkare/återförsäljare
- Via UI: Gå till Listor-sektionen
- Via kod: Uppdatera `scripts/init-production.ts`

## 🚨 Felsökning

### Applikationen startar inte
1. Kontrollera att Firebase-emulatorn körs
2. Kontrollera att port 3000 och 8080 är lediga
3. Kör `npm install` om dependencies saknas

### Data försvinner
- Firebase-emulator sparar data temporärt
- Starta om emulatorn med samma projektID för att behålla data
- Använd `firebase emulators:start --import=backup/` för att återställa

### Beräkningar stämmer inte
- Kontrollera att alla priser är i USD
- Verifiera att sannolikheter är mellan 0.0-1.0
- Se till att kostnad inte är högre än försäljningspris

## 📈 Nästa steg

### Utbyggnad
- **CSV-import/export**: För massuppdateringar
- **Rapporter**: Månads- och kvartalsrapporter
- **Integrationer**: CRM-system, e-post
- **Mobil-app**: React Native eller PWA

### Deployment
- **Vercel**: För hosting av frontend
- **Firebase Production**: För riktig databas
- **Domän**: Egen domän för professionell look

## 📞 Support

För frågor eller problem:
1. Kontrollera denna guide först
2. Se README.md för teknisk information
3. Kontakta utvecklaren för avancerade frågor

---

**Lycka till med din forecasting! 🎯**
