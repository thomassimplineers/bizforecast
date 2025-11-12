import { Deal, Manufacturer } from '@/types';
import * as XLSX from 'xlsx';

// Simplified styling - clean and professional
const HEADER_STYLE = {
  font: { bold: true, size: 12, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "2563EB" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "1E40AF" } },
    bottom: { style: "medium", color: { rgb: "1E40AF" } },
    left: { style: "thin", color: { rgb: "1E40AF" } },
    right: { style: "thin", color: { rgb: "1E40AF" } }
  }
};

const MANUFACTURER_STYLE = {
  font: { bold: true, size: 11 },
  fill: { fgColor: { rgb: "F3F4F6" } },
  alignment: { horizontal: "left", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "medium", color: { rgb: "9CA3AF" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } }
  }
};

const CURRENCY_STYLE = {
  numFmt: "#,##0",
  font: { size: 10 },
  alignment: { horizontal: "right", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "E5E7EB" } },
    bottom: { style: "thin", color: { rgb: "E5E7EB" } },
    left: { style: "thin", color: { rgb: "E5E7EB" } },
    right: { style: "thin", color: { rgb: "E5E7EB" } }
  }
};

const TOTAL_STYLE = {
  font: { bold: true, size: 11, color: { rgb: "FFFFFF" } },
  numFmt: "#,##0",
  fill: { fgColor: { rgb: "DC2626" } },
  alignment: { horizontal: "right", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "B91C1C" } },
    bottom: { style: "medium", color: { rgb: "B91C1C" } },
    left: { style: "medium", color: { rgb: "B91C1C" } },
    right: { style: "medium", color: { rgb: "B91C1C" } }
  }
};

interface MonthData {
  revenue: number;
  margin: number;
  dealCount: number;
  deals: Deal[];
}

interface ManufacturerData {
  name: string;
  months: Map<string, MonthData>;
  totalRevenue: number;
  totalMargin: number;
  totalDeals: number;
}

/**
 * Förenklad Excel-export för forecasting - ENDAST 3 FLIKAR
 * Flik 1: Kombinerad Matrix (Tillverkare × Månad) med omsättning, marginal USD och marginal %
 * Flik 2: Sammanfattning per Tillverkare & Månad
 * Flik 3: Alla Affärer i detalj
 */
export function exportSimplifiedForecast(
  deals: Deal[],
  manufacturers: Manufacturer[]
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const workbook = XLSX.utils.book_new();

  // Filter: endast öppna och vunna affärer (exkludera förlorade)
  const relevantDeals = deals.filter(d => d.status !== 'lost');
  
  // Skapa manufacturer lookup
  const manufacturerMap = new Map(manufacturers.map(m => [m.id, m.name]));
  
  // FLIK 1: Kombinerad Matrix - Omsättning, Marginal USD och Marginal % per Tillverkare & Månad
  const combinedMatrix = createCombinedForecastMatrix(relevantDeals, manufacturerMap);
  XLSX.utils.book_append_sheet(workbook, combinedMatrix, 'Forecast Matrix');
  
  // FLIK 2: Sammanfattning per Tillverkare & Månad (grupperad lista)
  const summary = createManufacturerMonthSummary(relevantDeals, manufacturerMap);
  XLSX.utils.book_append_sheet(workbook, summary, 'Tillverkare & Månad');
  
  // FLIK 3: Alla Affärer i detalj
  const dealsList = createDetailedDealsList(relevantDeals, manufacturerMap);
  XLSX.utils.book_append_sheet(workbook, dealsList, 'Alla Affärer');

  // Spara filen
  XLSX.writeFile(workbook, `Forecasting_${timestamp}.xlsx`);
}

/**
 * COMMITTED FORECAST - Excel-export med affärer ≥70% sannolikhet UTAN viktning
 * Flik 1: Kombinerad Matrix (Tillverkare × Månad) med FULL omsättning och marginal
 * Flik 2: Sammanfattning per Tillverkare & Månad
 * Flik 3: Alla Affärer i detalj
 */
export function exportCommittedForecast(
  deals: Deal[],
  manufacturers: Manufacturer[]
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const workbook = XLSX.utils.book_new();

  // Filter: endast affärer med ≥70% sannolikhet (exkludera förlorade)
  const committedDeals = deals.filter(d => d.status !== 'lost' && d.probability >= 0.7);
  
  console.log(`📊 Committed Forecast: ${committedDeals.length} affärer med ≥70% sannolikhet`);
  
  // Skapa manufacturer lookup
  const manufacturerMap = new Map(manufacturers.map(m => [m.id, m.name]));
  
  // FLIK 1: Kombinerad Matrix - FULL Omsättning och Marginal (INTE viktad)
  const combinedMatrix = createCommittedForecastMatrix(committedDeals, manufacturerMap);
  XLSX.utils.book_append_sheet(workbook, combinedMatrix, 'Committed Matrix');
  
  // FLIK 2: Sammanfattning per Tillverkare & Månad
  const summary = createCommittedManufacturerMonthSummary(committedDeals, manufacturerMap);
  XLSX.utils.book_append_sheet(workbook, summary, 'Tillverkare & Månad');
  
  // FLIK 3: Alla Affärer i detalj
  const dealsList = createDetailedDealsList(committedDeals, manufacturerMap);
  XLSX.utils.book_append_sheet(workbook, dealsList, 'Alla Affärer');

  // Spara filen
  XLSX.writeFile(workbook, `Committed_Forecast_${timestamp}.xlsx`);
}

/**
 * FLIK 1: Kombinerad Forecast Matrix
 * Visar tillverkare × månad med omsättning, marginal USD och marginal % tillsammans
 */
function createCombinedForecastMatrix(
  deals: Deal[],
  manufacturerMap: Map<string, string>
): XLSX.WorkSheet {
  const data = aggregateByManufacturerMonth(deals, manufacturerMap);
  const allMonths = getAllMonthsSorted(deals);
  
  // Bygg matrix med grupperade kolumner per månad (Omsättning, Marginal USD, Marginal %)
  const headerRow1 = ['Tillverkare'];
  const headerRow2 = [''];
  
  allMonths.forEach(month => {
    headerRow1.push(formatMonth(month), '', '');
    headerRow2.push('Omsättning', 'Marginal USD', 'Marginal %');
  });
  headerRow1.push('TOTALT', '', '');
  headerRow2.push('Omsättning', 'Marginal USD', 'Marginal %');

  const matrix: any[][] = [
    ['📊 FORECAST MATRIX - TILLVERKARE × MÅNAD', ...Array(headerRow1.length - 1).fill('')],
    [`Genererad: ${new Date().toLocaleDateString('sv-SE')} | ${deals.length} affärer`, ...Array(headerRow1.length - 1).fill('')],
    [],
    headerRow1,
    headerRow2
  ];

  // Lägg till tillverkare-rader
  const sortedManufacturers = Array.from(data.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  sortedManufacturers.forEach(mData => {
    const row: any[] = [mData.name];
    
    allMonths.forEach(month => {
      const monthData = mData.months.get(month);
      if (monthData) {
        const marginPct = monthData.revenue > 0 ? (monthData.margin / monthData.revenue) : 0;
        row.push(monthData.revenue, monthData.margin, marginPct);
      } else {
        row.push(0, 0, 0);
      }
    });
    
    // Totaler
    const totalMarginPct = mData.totalRevenue > 0 ? (mData.totalMargin / mData.totalRevenue) : 0;
    row.push(mData.totalRevenue, mData.totalMargin, totalMarginPct);
    matrix.push(row);
  });

  // Total-rad
  const totalRow: any[] = ['TOTALT'];
  let grandTotalRevenue = 0;
  let grandTotalMargin = 0;
  
  allMonths.forEach(month => {
    let monthTotalRevenue = 0;
    let monthTotalMargin = 0;
    data.forEach(mData => {
      const monthData = mData.months.get(month);
      if (monthData) {
        monthTotalRevenue += monthData.revenue;
        monthTotalMargin += monthData.margin;
      }
    });
    const monthMarginPct = monthTotalRevenue > 0 ? (monthTotalMargin / monthTotalRevenue) : 0;
    totalRow.push(monthTotalRevenue, monthTotalMargin, monthMarginPct);
    grandTotalRevenue += monthTotalRevenue;
    grandTotalMargin += monthTotalMargin;
  });
  
  const grandMarginPct = grandTotalRevenue > 0 ? (grandTotalMargin / grandTotalRevenue) : 0;
  totalRow.push(grandTotalRevenue, grandTotalMargin, grandMarginPct);
  matrix.push(totalRow);

  // Skapa worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(matrix);
  
  // Column widths
  const colWidths = [{ wch: 22 }]; // Tillverkare
  allMonths.forEach(() => {
    colWidths.push({ wch: 14 }, { wch: 14 }, { wch: 12 }); // Omsättning, Marginal, %
  });
  colWidths.push({ wch: 16 }, { wch: 16 }, { wch: 12 }); // Totaler
  worksheet['!cols'] = colWidths;

  // Apply styling
  matrix.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      if (!worksheet[cellAddress]) return;

      // Title row
      if (rowIndex === 0) {
        worksheet[cellAddress].s = {
          font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E3A8A" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Subtitle row
      else if (rowIndex === 1) {
        worksheet[cellAddress].s = {
          font: { size: 10, color: { rgb: "6B7280" } },
          fill: { fgColor: { rgb: "F9FAFB" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Header rows
      else if (rowIndex === 3 || rowIndex === 4) {
        worksheet[cellAddress].s = HEADER_STYLE;
      }
      // Total row
      else if (rowIndex === matrix.length - 1) {
        worksheet[cellAddress].s = colIndex === 0 ? 
          { ...TOTAL_STYLE, alignment: { horizontal: "center", vertical: "center" } } : 
          TOTAL_STYLE;
      }
      // Manufacturer column
      else if (colIndex === 0 && rowIndex > 4) {
        worksheet[cellAddress].s = MANUFACTURER_STYLE;
      }
      // Percentage columns (every 3rd column starting from column 3)
      else if (rowIndex > 4 && (colIndex - 3) % 3 === 0 && typeof cell === 'number') {
        worksheet[cellAddress].s = {
          numFmt: "0.00%",
          font: { size: 10 },
          alignment: { horizontal: "right", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "E5E7EB" } },
            bottom: { style: "thin", color: { rgb: "E5E7EB" } },
            left: { style: "thin", color: { rgb: "E5E7EB" } },
            right: { style: "thin", color: { rgb: "E5E7EB" } }
          }
        };
      }
      // Data cells
      else if (rowIndex > 4 && typeof cell === 'number') {
        worksheet[cellAddress].s = CURRENCY_STYLE;
      }
    });
  });

  // Freeze panes
  worksheet['!freeze'] = { xSplit: 1, ySplit: 5 };
  
  return worksheet;
}

/**
 * FLIK 2: Sammanfattning per Tillverkare & Månad
 * Grupperad lista som visar varje kombination av tillverkare och månad
 */
function createManufacturerMonthSummary(
  deals: Deal[],
  manufacturerMap: Map<string, string>
): XLSX.WorkSheet {
  const data = aggregateByManufacturerMonth(deals, manufacturerMap);
  const allMonths = getAllMonthsSorted(deals);
  
  const summaryData: any[][] = [
    ['📋 SAMMANFATTNING PER TILLVERKARE & MÅNAD', '', '', '', '', ''],
    [`Genererad: ${new Date().toLocaleDateString('sv-SE')}`, '', '', '', '', ''],
    [],
    ['Tillverkare', 'Månad', 'Antal Affärer', 'Viktad Omsättning', 'Viktad Marginal', 'Genomsnittsmarginal %']
  ];

  // Sortera tillverkare efter total omsättning
  const sortedManufacturers = Array.from(data.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Lägg till rad för varje kombination av tillverkare och månad
  sortedManufacturers.forEach(mData => {
    allMonths.forEach(month => {
      const monthData = mData.months.get(month);
      if (monthData && monthData.dealCount > 0) {
        const marginPct = monthData.revenue > 0 ? (monthData.margin / monthData.revenue) : 0;
        summaryData.push([
          mData.name,
          formatMonth(month),
          monthData.dealCount,
          monthData.revenue,
          monthData.margin,
          marginPct
        ]);
      }
    });
  });

  // Skapa worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Column widths
  worksheet['!cols'] = [
    { wch: 22 }, // Tillverkare
    { wch: 12 }, // Månad
    { wch: 14 }, // Antal
    { wch: 18 }, // Omsättning
    { wch: 18 }, // Marginal
    { wch: 20 }  // Marginal %
  ];

  // Apply styling
  summaryData.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      if (!worksheet[cellAddress]) return;

      if (rowIndex === 0) {
        worksheet[cellAddress].s = {
          font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "2563EB" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      } else if (rowIndex === 3) {
        worksheet[cellAddress].s = HEADER_STYLE;
      } else if (rowIndex > 3) {
        // Percentage column
        if (colIndex === 5 && typeof cell === 'number') {
          worksheet[cellAddress].s = {
            numFmt: "0.00%",
            alignment: { horizontal: "right", vertical: "center" }
          };
        } else if (typeof cell === 'number') {
          worksheet[cellAddress].s = CURRENCY_STYLE;
        }
      }
    });
  });

  worksheet['!freeze'] = { xSplit: 0, ySplit: 4 };
  
  return worksheet;
}

/**
 * Skapa detaljerad affärslista för drill-down
 */
function createDetailedDealsList(
  deals: Deal[],
  manufacturerMap: Map<string, string>
): XLSX.WorkSheet {
  const data: any[][] = [
    ['📋 ALLA AFFÄRER - KOMPLETT ÖVERSIKT', '', '', '', '', '', '', ''],
    [`Genererad: ${new Date().toLocaleDateString('sv-SE')} | ${deals.length} affärer`, '', '', '', '', '', '', ''],
    [],
    ['Tillverkare', 'Slutkund', 'Månad', 'Status', 'Sannolikhet %', 'Omsättning (USD)', 'Marginal (USD)', 'Marginal %']
  ];

  // Sortera affärer per månad
  const sortedDeals = [...deals].sort((a, b) => 
    a.expectedCloseMonth.localeCompare(b.expectedCloseMonth)
  );

  sortedDeals.forEach(deal => {
    const manufacturerName = manufacturerMap.get(deal.manufacturerId) || 'Unknown';
    const statusDisplay = getStatusLabel(deal.status);
    
    data.push([
      manufacturerName,
      deal.endCustomer,
      deal.expectedCloseMonth,
      statusDisplay,
      deal.probability,
      deal.sellUSD,
      deal.marginUSD,
      deal.marginPct
    ]);
  });

  // Total-rad
  const totalRevenue = deals.reduce((sum, d) => sum + d.sellUSD, 0);
  const totalMargin = deals.reduce((sum, d) => sum + d.marginUSD, 0);
  const avgProbability = deals.length > 0 ? deals.reduce((sum, d) => sum + d.probability, 0) / deals.length : 0;
  const avgMarginPct = totalRevenue > 0 ? totalMargin / totalRevenue : 0;

  data.push([
    'TOTALT',
    '',
    '',
    '',
    avgProbability,
    totalRevenue,
    totalMargin,
    avgMarginPct
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Tillverkare
    { wch: 30 }, // Slutkund
    { wch: 12 }, // Månad
    { wch: 16 }, // Status
    { wch: 12 }, // Sannolikhet
    { wch: 16 }, // Omsättning
    { wch: 16 }, // Marginal
    { wch: 12 }  // Marginal %
  ];

  // Apply styling
  data.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      if (!worksheet[cellAddress]) return;

      if (rowIndex === 0) {
        worksheet[cellAddress].s = {
          font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "2563EB" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      } else if (rowIndex === 3) {
        worksheet[cellAddress].s = HEADER_STYLE;
      } else if (rowIndex === data.length - 1) {
        if (colIndex === 0) {
          worksheet[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "DC2626" } },
            alignment: { horizontal: "left", vertical: "center" }
          };
        } else if (typeof cell === 'number') {
          worksheet[cellAddress].s = TOTAL_STYLE;
        }
      } else if (rowIndex > 3) {
        // Percentage columns
        if (colIndex === 4 || colIndex === 7) {
          worksheet[cellAddress].s = {
            numFmt: "0.00%",
            alignment: { horizontal: "right", vertical: "center" }
          };
        } else if (typeof cell === 'number') {
          worksheet[cellAddress].s = CURRENCY_STYLE;
        }
      }
    });
  });

  worksheet['!freeze'] = { xSplit: 0, ySplit: 4 };
  
  return worksheet;
}

/**
 * Aggregera data per tillverkare och månad (VIKTAD)
 */
function aggregateByManufacturerMonth(
  deals: Deal[],
  manufacturerMap: Map<string, string>
): Map<string, ManufacturerData> {
  const data = new Map<string, ManufacturerData>();

  deals.forEach(deal => {
    const manufacturerId = deal.manufacturerId;
    const manufacturerName = manufacturerMap.get(manufacturerId) || 'Unknown';
    const month = deal.expectedCloseMonth;

    if (!data.has(manufacturerId)) {
      data.set(manufacturerId, {
        name: manufacturerName,
        months: new Map(),
        totalRevenue: 0,
        totalMargin: 0,
        totalDeals: 0
      });
    }

    const mData = data.get(manufacturerId)!;

    if (!mData.months.has(month)) {
      mData.months.set(month, {
        revenue: 0,
        margin: 0,
        dealCount: 0,
        deals: []
      });
    }

    const monthData = mData.months.get(month)!;
    const weightedRevenue = deal.sellUSD * deal.probability;
    const weightedMargin = deal.marginUSD * deal.probability;

    monthData.revenue += weightedRevenue;
    monthData.margin += weightedMargin;
    monthData.dealCount++;
    monthData.deals.push(deal);

    mData.totalRevenue += weightedRevenue;
    mData.totalMargin += weightedMargin;
    mData.totalDeals++;
  });

  return data;
}

/**
 * Aggregera data per tillverkare och månad (COMMITTED - UTAN viktning)
 * Använder FULL sellUSD och marginUSD istället för viktade värden
 */
function aggregateCommittedByManufacturerMonth(
  deals: Deal[],
  manufacturerMap: Map<string, string>
): Map<string, ManufacturerData> {
  const data = new Map<string, ManufacturerData>();

  deals.forEach(deal => {
    const manufacturerId = deal.manufacturerId;
    const manufacturerName = manufacturerMap.get(manufacturerId) || 'Unknown';
    const month = deal.expectedCloseMonth;

    if (!data.has(manufacturerId)) {
      data.set(manufacturerId, {
        name: manufacturerName,
        months: new Map(),
        totalRevenue: 0,
        totalMargin: 0,
        totalDeals: 0
      });
    }

    const mData = data.get(manufacturerId)!;

    if (!mData.months.has(month)) {
      mData.months.set(month, {
        revenue: 0,
        margin: 0,
        dealCount: 0,
        deals: []
      });
    }

    const monthData = mData.months.get(month)!;
    // COMMITTED: Använd FULL värden (INTE viktade)
    monthData.revenue += deal.sellUSD;
    monthData.margin += deal.marginUSD;
    monthData.dealCount++;
    monthData.deals.push(deal);

    mData.totalRevenue += deal.sellUSD;
    mData.totalMargin += deal.marginUSD;
    mData.totalDeals++;
  });

  return data;
}

/**
 * FLIK 1: Committed Forecast Matrix (UTAN viktning)
 * Visar tillverkare × månad med FULL omsättning och marginal för affärer ≥70%
 */
function createCommittedForecastMatrix(
  deals: Deal[],
  manufacturerMap: Map<string, string>
): XLSX.WorkSheet {
  const data = aggregateCommittedByManufacturerMonth(deals, manufacturerMap);
  const allMonths = getAllMonthsSorted(deals);
  
  // Bygg matrix med grupperade kolumner per månad (Omsättning, Marginal USD, Marginal %)
  const headerRow1 = ['Tillverkare'];
  const headerRow2 = [''];
  
  allMonths.forEach(month => {
    headerRow1.push(formatMonth(month), '', '');
    headerRow2.push('Omsättning', 'Marginal USD', 'Marginal %');
  });
  headerRow1.push('TOTALT', '', '');
  headerRow2.push('Omsättning', 'Marginal USD', 'Marginal %');

  const matrix: any[][] = [
    ['🎯 COMMITTED FORECAST - TILLVERKARE × MÅNAD (≥70%)', ...Array(headerRow1.length - 1).fill('')],
    [`Genererad: ${new Date().toLocaleDateString('sv-SE')} | ${deals.length} affärer med ≥70% sannolikhet | INTE viktad`, ...Array(headerRow1.length - 1).fill('')],
    [],
    headerRow1,
    headerRow2
  ];

  // Lägg till tillverkare-rader
  const sortedManufacturers = Array.from(data.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  sortedManufacturers.forEach(mData => {
    const row: any[] = [mData.name];
    
    allMonths.forEach(month => {
      const monthData = mData.months.get(month);
      if (monthData) {
        const marginPct = monthData.revenue > 0 ? (monthData.margin / monthData.revenue) : 0;
        row.push(monthData.revenue, monthData.margin, marginPct);
      } else {
        row.push(0, 0, 0);
      }
    });
    
    // Totaler
    const totalMarginPct = mData.totalRevenue > 0 ? (mData.totalMargin / mData.totalRevenue) : 0;
    row.push(mData.totalRevenue, mData.totalMargin, totalMarginPct);
    matrix.push(row);
  });

  // Total-rad
  const totalRow: any[] = ['TOTALT'];
  let grandTotalRevenue = 0;
  let grandTotalMargin = 0;
  
  allMonths.forEach(month => {
    let monthTotalRevenue = 0;
    let monthTotalMargin = 0;
    data.forEach(mData => {
      const monthData = mData.months.get(month);
      if (monthData) {
        monthTotalRevenue += monthData.revenue;
        monthTotalMargin += monthData.margin;
      }
    });
    const monthMarginPct = monthTotalRevenue > 0 ? (monthTotalMargin / monthTotalRevenue) : 0;
    totalRow.push(monthTotalRevenue, monthTotalMargin, monthMarginPct);
    grandTotalRevenue += monthTotalRevenue;
    grandTotalMargin += monthTotalMargin;
  });
  
  const grandMarginPct = grandTotalRevenue > 0 ? (grandTotalMargin / grandTotalRevenue) : 0;
  totalRow.push(grandTotalRevenue, grandTotalMargin, grandMarginPct);
  matrix.push(totalRow);

  // Skapa worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(matrix);
  
  // Column widths
  const colWidths = [{ wch: 22 }]; // Tillverkare
  allMonths.forEach(() => {
    colWidths.push({ wch: 14 }, { wch: 14 }, { wch: 12 }); // Omsättning, Marginal, %
  });
  colWidths.push({ wch: 16 }, { wch: 16 }, { wch: 12 }); // Totaler
  worksheet['!cols'] = colWidths;

  // Apply styling
  matrix.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      if (!worksheet[cellAddress]) return;

      // Title row
      if (rowIndex === 0) {
        worksheet[cellAddress].s = {
          font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "059669" } }, // Green for committed
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Subtitle row
      else if (rowIndex === 1) {
        worksheet[cellAddress].s = {
          font: { size: 10, color: { rgb: "6B7280" } },
          fill: { fgColor: { rgb: "F9FAFB" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Header rows
      else if (rowIndex === 3 || rowIndex === 4) {
        worksheet[cellAddress].s = HEADER_STYLE;
      }
      // Total row
      else if (rowIndex === matrix.length - 1) {
        worksheet[cellAddress].s = colIndex === 0 ? 
          { ...TOTAL_STYLE, alignment: { horizontal: "center", vertical: "center" } } : 
          TOTAL_STYLE;
      }
      // Manufacturer column
      else if (colIndex === 0 && rowIndex > 4) {
        worksheet[cellAddress].s = MANUFACTURER_STYLE;
      }
      // Percentage columns (every 3rd column starting from column 3)
      else if (rowIndex > 4 && (colIndex - 3) % 3 === 0 && typeof cell === 'number') {
        worksheet[cellAddress].s = {
          numFmt: "0.00%",
          font: { size: 10 },
          alignment: { horizontal: "right", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "E5E7EB" } },
            bottom: { style: "thin", color: { rgb: "E5E7EB" } },
            left: { style: "thin", color: { rgb: "E5E7EB" } },
            right: { style: "thin", color: { rgb: "E5E7EB" } }
          }
        };
      }
      // Data cells
      else if (rowIndex > 4 && typeof cell === 'number') {
        worksheet[cellAddress].s = CURRENCY_STYLE;
      }
    });
  });

  // Freeze panes
  worksheet['!freeze'] = { xSplit: 1, ySplit: 5 };
  
  return worksheet;
}

/**
 * FLIK 2: Committed Sammanfattning per Tillverkare & Månad (UTAN viktning)
 */
function createCommittedManufacturerMonthSummary(
  deals: Deal[],
  manufacturerMap: Map<string, string>
): XLSX.WorkSheet {
  const data = aggregateCommittedByManufacturerMonth(deals, manufacturerMap);
  const allMonths = getAllMonthsSorted(deals);
  
  const summaryData: any[][] = [
    ['🎯 COMMITTED - SAMMANFATTNING PER TILLVERKARE & MÅNAD (≥70%)', '', '', '', '', ''],
    [`Genererad: ${new Date().toLocaleDateString('sv-SE')} | FULL omsättning (INTE viktad)`, '', '', '', '', ''],
    [],
    ['Tillverkare', 'Månad', 'Antal Affärer', 'Omsättning', 'Marginal', 'Genomsnittsmarginal %']
  ];

  // Sortera tillverkare efter total omsättning
  const sortedManufacturers = Array.from(data.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Lägg till rad för varje kombination av tillverkare och månad
  sortedManufacturers.forEach(mData => {
    allMonths.forEach(month => {
      const monthData = mData.months.get(month);
      if (monthData && monthData.dealCount > 0) {
        const marginPct = monthData.revenue > 0 ? (monthData.margin / monthData.revenue) : 0;
        summaryData.push([
          mData.name,
          formatMonth(month),
          monthData.dealCount,
          monthData.revenue,
          monthData.margin,
          marginPct
        ]);
      }
    });
  });

  // Skapa worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Column widths
  worksheet['!cols'] = [
    { wch: 22 }, // Tillverkare
    { wch: 12 }, // Månad
    { wch: 14 }, // Antal
    { wch: 18 }, // Omsättning
    { wch: 18 }, // Marginal
    { wch: 20 }  // Marginal %
  ];

  // Apply styling
  summaryData.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      if (!worksheet[cellAddress]) return;

      if (rowIndex === 0) {
        worksheet[cellAddress].s = {
          font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "059669" } }, // Green for committed
          alignment: { horizontal: "center", vertical: "center" }
        };
      } else if (rowIndex === 3) {
        worksheet[cellAddress].s = HEADER_STYLE;
      } else if (rowIndex > 3) {
        // Percentage column
        if (colIndex === 5 && typeof cell === 'number') {
          worksheet[cellAddress].s = {
            numFmt: "0.00%",
            alignment: { horizontal: "right", vertical: "center" }
          };
        } else if (typeof cell === 'number') {
          worksheet[cellAddress].s = CURRENCY_STYLE;
        }
      }
    });
  });

  worksheet['!freeze'] = { xSplit: 0, ySplit: 4 };
  
  return worksheet;
}

/**
 * Hämta alla unika månader sorterade
 */
function getAllMonthsSorted(deals: Deal[]): string[] {
  return [...new Set(deals.map(d => d.expectedCloseMonth))].sort();
}

/**
 * Formatera månad för visning
 */
function formatMonth(monthStr: string): string {
  const date = new Date(monthStr + '-01');
  return date.toLocaleDateString('sv-SE', { 
    month: 'short', 
    year: '2-digit' 
  });
}

/**
 * Hämta status label
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    won: 'Vunnen',
    proposal: 'Förslag',
    verbal: 'Muntligt',
    qualified: 'Kvalificerad',
    discovery: 'Upptäckt',
    lost: 'Förlorad'
  };
  return labels[status] || status;
}

/**
 * Applicera matrix styling
 */
function applyMatrixStyles(worksheet: XLSX.WorkSheet, data: any[][], totalCols: number) {
  // Set column widths
  const colWidths = [{ wch: 22 }]; // Manufacturer column
  for (let i = 1; i < totalCols - 1; i++) {
    colWidths.push({ wch: 12 }); // Month columns
  }
  colWidths.push({ wch: 16 }); // Total column
  worksheet['!cols'] = colWidths;

  // Apply styles
  data.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      if (!worksheet[cellAddress]) return;

      // Title row
      if (rowIndex === 0) {
        worksheet[cellAddress].s = {
          font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1E3A8A" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "medium", color: { rgb: "1E3A8A" } },
            bottom: { style: "medium", color: { rgb: "1E3A8A" } }
          }
        };
      }
      // Subtitle row
      else if (rowIndex === 1) {
        worksheet[cellAddress].s = {
          font: { size: 10, color: { rgb: "6B7280" } },
          fill: { fgColor: { rgb: "F9FAFB" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
      // Header row
      else if (rowIndex === 3) {
        worksheet[cellAddress].s = HEADER_STYLE;
      }
      // Total row
      else if (rowIndex === data.length - 1) {
        worksheet[cellAddress].s = colIndex === 0 ? 
          { ...TOTAL_STYLE, alignment: { horizontal: "center", vertical: "center" } } : 
          TOTAL_STYLE;
      }
      // Manufacturer column
      else if (colIndex === 0 && rowIndex > 3) {
        worksheet[cellAddress].s = MANUFACTURER_STYLE;
      }
      // Data cells
      else if (rowIndex > 3 && typeof cell === 'number') {
        worksheet[cellAddress].s = CURRENCY_STYLE;
      }
    });
  });

  // Freeze panes
  worksheet['!freeze'] = { xSplit: 1, ySplit: 4 };
}
