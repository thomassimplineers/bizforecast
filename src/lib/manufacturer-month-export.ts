import { Deal, Manufacturer } from '@/types';
import { formatCurrency } from './calculations';
import * as XLSX from 'xlsx';

interface ManufacturerMonthData {
  manufacturerId: string;
  manufacturerName: string;
  monthlyData: Map<string, {
    dealCount: number;
    totalRevenue: number;
    totalMargin: number;
    weightedRevenue: number;
    weightedMargin: number;
    averageMarginPct: number;
  }>;
  totals: {
    dealCount: number;
    totalRevenue: number;
    totalMargin: number;
    weightedRevenue: number;
    weightedMargin: number;
    averageMarginPct: number;
  };
}

// Excel styling for manufacturer-month matrix - Enhanced visual design
const TITLE_STYLE = {
  font: { bold: true, size: 18, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "1E3A8A" } }, // Deep blue gradient
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "1E3A8A" } },
    bottom: { style: "medium", color: { rgb: "1E3A8A" } },
    left: { style: "medium", color: { rgb: "1E3A8A" } },
    right: { style: "medium", color: { rgb: "1E3A8A" } }
  }
};

const MATRIX_HEADER_STYLE = {
  font: { bold: true, size: 12, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "2563EB" } }, // Professional blue
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "1D4ED8" } },
    bottom: { style: "medium", color: { rgb: "1D4ED8" } },
    left: { style: "thin", color: { rgb: "1D4ED8" } },
    right: { style: "thin", color: { rgb: "1D4ED8" } }
  }
};

const MONTH_HEADER_STYLE = {
  font: { bold: true, size: 11, color: { rgb: "1E40AF" } },
  fill: { fgColor: { rgb: "DBEAFE" } }, // Light blue gradient
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "3B82F6" } },
    bottom: { style: "medium", color: { rgb: "3B82F6" } },
    left: { style: "thin", color: { rgb: "60A5FA" } },
    right: { style: "thin", color: { rgb: "60A5FA" } }
  }
};

const MANUFACTURER_STYLE = {
  font: { bold: true, size: 11, color: { rgb: "374151" } },
  fill: { fgColor: { rgb: "F8FAFC" } }, // Subtle gray
  alignment: { horizontal: "left", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "CBD5E1" } },
    bottom: { style: "thin", color: { rgb: "CBD5E1" } },
    left: { style: "medium", color: { rgb: "94A3B8" } },
    right: { style: "thin", color: { rgb: "CBD5E1" } }
  }
};

const DATA_CELL_STYLE = {
  numFmt: "#,##0",
  font: { size: 10 },
  alignment: { horizontal: "right", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "E2E8F0" } },
    bottom: { style: "thin", color: { rgb: "E2E8F0" } },
    left: { style: "thin", color: { rgb: "E2E8F0" } },
    right: { style: "thin", color: { rgb: "E2E8F0" } }
  }
};

const HIGH_VALUE_STYLE = {
  numFmt: "#,##0",
  font: { size: 10, bold: true, color: { rgb: "059669" } }, // Green for high values
  fill: { fgColor: { rgb: "ECFDF5" } },
  alignment: { horizontal: "right", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "10B981" } },
    bottom: { style: "thin", color: { rgb: "10B981" } },
    left: { style: "thin", color: { rgb: "10B981" } },
    right: { style: "thin", color: { rgb: "10B981" } }
  }
};

const MEDIUM_VALUE_STYLE = {
  numFmt: "#,##0",
  font: { size: 10 },
  fill: { fgColor: { rgb: "FFFBEB" } }, // Light amber
  alignment: { horizontal: "right", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "F59E0B" } },
    bottom: { style: "thin", color: { rgb: "F59E0B" } },
    left: { style: "thin", color: { rgb: "F59E0B" } },
    right: { style: "thin", color: { rgb: "F59E0B" } }
  }
};

const LOW_VALUE_STYLE = {
  numFmt: "#,##0",
  font: { size: 10, color: { rgb: "6B7280" } },
  fill: { fgColor: { rgb: "FAFAFA" } },
  alignment: { horizontal: "right", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "thin", color: { rgb: "D1D5DB" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } }
  }
};

// Percentage styles for margin columns
const HIGH_PERCENTAGE_STYLE = {
  numFmt: "0.00%",
  font: { size: 10, bold: true, color: { rgb: "059669" } },
  fill: { fgColor: { rgb: "ECFDF5" } },
  alignment: { horizontal: "right", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "10B981" } },
    bottom: { style: "thin", color: { rgb: "10B981" } },
    left: { style: "thin", color: { rgb: "10B981" } },
    right: { style: "thin", color: { rgb: "10B981" } }
  }
};

const MEDIUM_PERCENTAGE_STYLE = {
  numFmt: "0.00%",
  font: { size: 10 },
  fill: { fgColor: { rgb: "FFFBEB" } },
  alignment: { horizontal: "right", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "F59E0B" } },
    bottom: { style: "thin", color: { rgb: "F59E0B" } },
    left: { style: "thin", color: { rgb: "F59E0B" } },
    right: { style: "thin", color: { rgb: "F59E0B" } }
  }
};

const LOW_PERCENTAGE_STYLE = {
  numFmt: "0.00%",
  font: { size: 10, color: { rgb: "6B7280" } },
  fill: { fgColor: { rgb: "FAFAFA" } },
  alignment: { horizontal: "right", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "thin", color: { rgb: "D1D5DB" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } }
  }
};

const TOTAL_CELL_STYLE = {
  font: { bold: true, size: 11, color: { rgb: "FFFFFF" } },
  numFmt: "#,##0",
  fill: { fgColor: { rgb: "DC2626" } }, // Strong red for totals
  alignment: { horizontal: "right", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "B91C1C" } },
    bottom: { style: "medium", color: { rgb: "B91C1C" } },
    left: { style: "medium", color: { rgb: "B91C1C" } },
    right: { style: "medium", color: { rgb: "B91C1C" } }
  }
};

const TOTAL_MANUFACTURER_STYLE = {
  font: { bold: true, size: 11, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "DC2626" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "B91C1C" } },
    bottom: { style: "medium", color: { rgb: "B91C1C" } },
    left: { style: "medium", color: { rgb: "B91C1C" } },
    right: { style: "medium", color: { rgb: "B91C1C" } }
  }
};

export function exportManufacturerMonthMatrix(
  deals: Deal[],
  manufacturers: Manufacturer[],
  excludePastDeals: boolean = true
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Filter deals
  const filterFutureDeals = (deals: Deal[]) => {
    if (!excludePastDeals) return deals;
    const currentMonth = new Date().toISOString().slice(0, 7);
    return deals.filter(deal => deal.expectedCloseMonth >= currentMonth);
  };

  const openDeals = deals.filter(deal => deal.status !== 'won' && deal.status !== 'lost');
  const filteredDeals = filterFutureDeals(openDeals);

  // Create manufacturer lookup
  const manufacturerMap = new Map(manufacturers.map(m => [m.id, m.name]));

  // Get all unique months and sort them
  const allMonths = [...new Set(filteredDeals.map(deal => deal.expectedCloseMonth))].sort();
  
  // Process data by manufacturer and month
  const manufacturerData = new Map<string, ManufacturerMonthData>();

  filteredDeals.forEach(deal => {
    const manufacturerId = deal.manufacturerId;
    const manufacturerName = manufacturerMap.get(manufacturerId) || 'Unknown';
    const month = deal.expectedCloseMonth;

    if (!manufacturerData.has(manufacturerId)) {
      manufacturerData.set(manufacturerId, {
        manufacturerId,
        manufacturerName,
        monthlyData: new Map(),
        totals: {
          dealCount: 0,
          totalRevenue: 0,
          totalMargin: 0,
          weightedRevenue: 0,
          weightedMargin: 0,
          averageMarginPct: 0
        }
      });
    }

    const mData = manufacturerData.get(manufacturerId)!;

    // Initialize month data if not exists
    if (!mData.monthlyData.has(month)) {
      mData.monthlyData.set(month, {
        dealCount: 0,
        totalRevenue: 0,
        totalMargin: 0,
        weightedRevenue: 0,
        weightedMargin: 0,
        averageMarginPct: 0
      });
    }

    const monthData = mData.monthlyData.get(month)!;

    // Update month data
    monthData.dealCount++;
    monthData.totalRevenue += deal.sellUSD;
    monthData.totalMargin += deal.marginUSD;
    monthData.weightedRevenue += deal.sellUSD * deal.probability;
    monthData.weightedMargin += deal.marginUSD * deal.probability;

    // Update totals
    mData.totals.dealCount++;
    mData.totals.totalRevenue += deal.sellUSD;
    mData.totals.totalMargin += deal.marginUSD;
    mData.totals.weightedRevenue += deal.sellUSD * deal.probability;
    mData.totals.weightedMargin += deal.marginUSD * deal.probability;
  });

  // Calculate average margins
  manufacturerData.forEach(mData => {
    if (mData.totals.totalRevenue > 0) {
      mData.totals.averageMarginPct = (mData.totals.totalMargin / mData.totals.totalRevenue) * 100;
    }
    
    mData.monthlyData.forEach(monthData => {
      if (monthData.totalRevenue > 0) {
        monthData.averageMarginPct = (monthData.totalMargin / monthData.totalRevenue) * 100;
      }
    });
  });

  // Format months for display
  const formatMonthDisplay = (monthStr: string) => {
    return new Date(monthStr + '-01').toLocaleDateString('sv-SE', { 
      month: 'short', 
      year: '2-digit' 
    });
  };

  // Create workbook with enhanced settings
  const workbook = XLSX.utils.book_new();
  
  // Set workbook properties for better Excel compatibility
  workbook.Props = {
    Title: "BizForecast Månadsmatrix",
    Subject: "Tillverkare och Månadsanalys",
    Author: "BizForecast Analytics",
    CreatedDate: new Date()
  };

  // 1. REVENUE MATRIX SHEET
  const revenueMatrix = createMatrixSheet(
    manufacturerData,
    allMonths,
    'weightedRevenue',
    '💰 Viktad Omsättning per Tillverkare & Månad',
    formatMonthDisplay
  );
  XLSX.utils.book_append_sheet(workbook, revenueMatrix, 'Omsättning Matrix');

  // 2. MARGIN MATRIX SHEET  
  const marginMatrix = createMatrixSheet(
    manufacturerData,
    allMonths,
    'weightedMargin',
    '💵 Viktad Marginal per Tillverkare & Månad',
    formatMonthDisplay
  );
  XLSX.utils.book_append_sheet(workbook, marginMatrix, 'Marginal Matrix');

  // 3. DEAL COUNT MATRIX SHEET
  const dealCountMatrix = createMatrixSheet(
    manufacturerData,
    allMonths,
    'dealCount',
    '📈 Antal Affärer per Tillverkare & Månad',
    formatMonthDisplay
  );
  XLSX.utils.book_append_sheet(workbook, dealCountMatrix, 'Antal Affärer');

  // 4. DETAILED SUMMARY SHEET
  const summarySheet = createDetailedSummarySheet(manufacturerData, allMonths, formatMonthDisplay);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Detaljerad Sammanfattning');

  // Save the workbook with specific options for better Excel compatibility
  XLSX.writeFile(workbook, `Tillverkare_Månadsmatrix_${timestamp}.xlsx`, {
    bookType: 'xlsx',
    cellStyles: true,
    sheetStubs: false
  });
}

function createMatrixSheet(
  manufacturerData: Map<string, ManufacturerMonthData>,
  allMonths: string[],
  dataField: 'weightedRevenue' | 'weightedMargin' | 'dealCount',
  title: string,
  formatMonth: (month: string) => string
): XLSX.WorkSheet {
  
  // Create header row
  const headerRow = ['Tillverkare', ...allMonths.map(formatMonth), 'TOTALT'];
  
  // Create data rows
  const dataRows: any[][] = [];
  const sortedManufacturers = Array.from(manufacturerData.values())
    .sort((a, b) => b.totals.weightedRevenue - a.totals.weightedRevenue);

  sortedManufacturers.forEach(mData => {
    const row: any[] = [mData.manufacturerName];
    
    // Add data for each month
    allMonths.forEach(month => {
      const monthData = mData.monthlyData.get(month);
      const value = monthData ? monthData[dataField] : 0;
      row.push(value);
    });
    
    // Add total
    row.push(mData.totals[dataField]);
    dataRows.push(row);
  });

  // Create totals row
  const totalsRow: any[] = ['TOTALT'];
  allMonths.forEach(month => {
    let monthTotal = 0;
    manufacturerData.forEach(mData => {
      const monthData = mData.monthlyData.get(month);
      if (monthData) {
        monthTotal += monthData[dataField];
      }
    });
    totalsRow.push(monthTotal);
  });
  
  // Grand total
  const grandTotal = Array.from(manufacturerData.values())
    .reduce((sum, mData) => sum + mData.totals[dataField], 0);
  totalsRow.push(grandTotal);

  // Create enhanced title row with company branding
  const titleRow = [title, ...Array(allMonths.length).fill(''), ''];
  const subtitleRow = [`BizForecast Analytics - ${new Date().toLocaleDateString('sv-SE')}`, ...Array(allMonths.length).fill(''), ''];
  
  // Combine all data
  const matrixData = [
    titleRow,
    subtitleRow,
    ['', ...Array(allMonths.length).fill(''), ''], // Empty row
    headerRow,
    ...dataRows,
    totalsRow
  ];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(matrixData);
  
  // Apply styling with data type information
  applyMatrixStyles(worksheet, matrixData, allMonths.length + 2, dataField);
  
  return worksheet;
}

function createDetailedSummarySheet(
  manufacturerData: Map<string, ManufacturerMonthData>,
  allMonths: string[],
  formatMonth: (month: string) => string
): XLSX.WorkSheet {
  
  const summaryData: any[][] = [
    ['📊 DETALJERAD TILLVERKARE & MÅNADSSAMMANFATTNING', '', '', '', '', '', ''],
    [`🗓️ Genererad: ${new Date().toLocaleDateString('sv-SE')} | BizForecast Analytics`, '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['🏢 Tillverkare', '📅 Månad', '📈 Antal Affärer', '💰 Viktad Omsättning (USD)', '💵 Viktad Marginal (USD)', '📊 Genomsnittsmarginal %', '🎯 Andel av Total %']
  ];

  const sortedManufacturers = Array.from(manufacturerData.values())
    .sort((a, b) => b.totals.weightedRevenue - a.totals.weightedRevenue);

  const grandTotalRevenue = sortedManufacturers.reduce((sum, m) => sum + m.totals.weightedRevenue, 0);

  sortedManufacturers.forEach(mData => {
    // Add manufacturer total first
    const manufacturerShare = grandTotalRevenue > 0 ? (mData.totals.weightedRevenue / grandTotalRevenue) * 100 : 0;
    summaryData.push([
      mData.manufacturerName,
      'TOTALT',
      mData.totals.dealCount,
      mData.totals.weightedRevenue,
      mData.totals.weightedMargin,
      mData.totals.averageMarginPct / 100, // Convert to decimal for percentage
      manufacturerShare / 100 // Convert to decimal for percentage
    ]);

    // Add monthly breakdown
    allMonths.forEach(month => {
      const monthData = mData.monthlyData.get(month);
      if (monthData && monthData.dealCount > 0) {
        const monthShare = grandTotalRevenue > 0 ? (monthData.weightedRevenue / grandTotalRevenue) * 100 : 0;
        summaryData.push([
          `  ${formatMonth(month)}`,
          '',
          monthData.dealCount,
          monthData.weightedRevenue,
          monthData.weightedMargin,
          monthData.averageMarginPct / 100,
          monthShare / 100
        ]);
      }
    });

    // Add separator
    summaryData.push(['', '', '', '', '', '', '']);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Apply column widths
  worksheet['!cols'] = [
    { wch: 25 }, // Tillverkare
    { wch: 12 }, // Månad
    { wch: 12 }, // Antal Affärer
    { wch: 16 }, // Viktad Omsättning
    { wch: 16 }, // Viktad Marginal
    { wch: 18 }, // Genomsnittsmarginal
    { wch: 16 }  // Andel av Total
  ];

  // Apply special formatting for summary sheet
  applySummaryStyles(worksheet, summaryData);

  // Freeze header rows
  worksheet['!freeze'] = { xSplit: 0, ySplit: 4 };

  return worksheet;
}

function applyMatrixStyles(worksheet: XLSX.WorkSheet, data: any[][], totalCols: number, dataField?: 'weightedRevenue' | 'weightedMargin' | 'dealCount') {
  if (!worksheet['!cols']) worksheet['!cols'] = [];
  
  // Set enhanced column widths
  const colWidths = [{ wch: 22 }]; // Manufacturer column - wider
  for (let i = 1; i < totalCols - 1; i++) {
    colWidths.push({ wch: 14 }); // Month columns - wider for better readability
  }
  colWidths.push({ wch: 16 }); // Total column - extra wide
  worksheet['!cols'] = colWidths;

  // Calculate value ranges for color coding (excluding header and total rows)
  const dataValues: number[] = [];
  data.forEach((row, rowIndex) => {
    if (rowIndex > 3 && rowIndex < data.length - 1) { // Skip headers and totals
      row.forEach((cell, colIndex) => {
        if (colIndex > 0 && typeof cell === 'number' && cell > 0) {
          dataValues.push(cell);
        }
      });
    }
  });

  dataValues.sort((a, b) => a - b);
  const highThreshold = dataValues[Math.floor(dataValues.length * 0.75)] || 0;
  const mediumThreshold = dataValues[Math.floor(dataValues.length * 0.25)] || 0;

  // Apply styles to cells
  data.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      
      if (!worksheet[cellAddress]) return;
      
      // Title row (main title)
      if (rowIndex === 0) {
        worksheet[cellAddress].s = TITLE_STYLE;
      }
      // Subtitle row
      else if (rowIndex === 1) {
        worksheet[cellAddress].s = {
          font: { bold: true, size: 12, color: { rgb: "64748B" } },
          fill: { fgColor: { rgb: "F1F5F9" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "CBD5E1" } },
            bottom: { style: "thin", color: { rgb: "CBD5E1" } },
            left: { style: "thin", color: { rgb: "CBD5E1" } },
            right: { style: "thin", color: { rgb: "CBD5E1" } }
          }
        };
      }
      // Header row (month names)
      else if (rowIndex === 3) {
        worksheet[cellAddress].s = colIndex === 0 ? MATRIX_HEADER_STYLE : MONTH_HEADER_STYLE;
      }
      // Totals row (last row)
      else if (rowIndex === data.length - 1) {
        worksheet[cellAddress].s = colIndex === 0 ? TOTAL_MANUFACTURER_STYLE : TOTAL_CELL_STYLE;
      }
      // Manufacturer name column
      else if (colIndex === 0 && rowIndex > 3) {
        worksheet[cellAddress].s = MANUFACTURER_STYLE;
      }
      // Data cells with value-based coloring
      else if (rowIndex > 3 && colIndex > 0) {
        const value = typeof cell === 'number' ? cell : 0;
        let style = DATA_CELL_STYLE;
        
        // Use percentage formatting for margin data in detailed summary
        const isPercentageData = dataField === undefined && colIndex >= 4; // Columns 4+ in summary sheet
        
        if (value > highThreshold) {
          style = isPercentageData ? HIGH_PERCENTAGE_STYLE : HIGH_VALUE_STYLE;
        } else if (value > mediumThreshold) {
          style = isPercentageData ? MEDIUM_PERCENTAGE_STYLE : MEDIUM_VALUE_STYLE;
        } else if (value > 0) {
          style = isPercentageData ? LOW_PERCENTAGE_STYLE : LOW_VALUE_STYLE;
        }
        
        worksheet[cellAddress].s = style;
      }
    });
  });

  // Enhanced freeze panes - freeze title, subtitle and headers
  worksheet['!freeze'] = { xSplit: 1, ySplit: 4 };
  
  // Add row heights for better visual appeal
  if (!worksheet['!rows']) worksheet['!rows'] = [];
  worksheet['!rows'][0] = { hpt: 25 }; // Title row height
  worksheet['!rows'][1] = { hpt: 18 }; // Subtitle row height
  worksheet['!rows'][3] = { hpt: 20 }; // Header row height
}

function applySummaryStyles(worksheet: XLSX.WorkSheet, data: any[][]) {
  // Apply styles to cells in summary sheet
  data.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      
      if (!worksheet[cellAddress]) return;
      
      // Initialize cell style object if it doesn't exist
      if (!worksheet[cellAddress].s) {
        worksheet[cellAddress].s = {};
      }
      
      // Title row
      if (rowIndex === 0) {
        worksheet[cellAddress].s = TITLE_STYLE;
      }
      // Subtitle row
      else if (rowIndex === 1) {
        worksheet[cellAddress].s = {
          font: { bold: true, size: 12, color: { rgb: "64748B" } },
          fill: { fgColor: { rgb: "F1F5F9" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "CBD5E1" } },
            bottom: { style: "thin", color: { rgb: "CBD5E1" } },
            left: { style: "thin", color: { rgb: "CBD5E1" } },
            right: { style: "thin", color: { rgb: "CBD5E1" } }
          }
        };
      }
      // Header row
      else if (rowIndex === 3) {
        worksheet[cellAddress].s = MATRIX_HEADER_STYLE;
      }
      // Data rows
      else if (rowIndex > 3) {
        // Manufacturer/month names (first column)
        if (colIndex === 0) {
          worksheet[cellAddress].s = MANUFACTURER_STYLE;
        }
        // Month column (second column)
        else if (colIndex === 1) {
          worksheet[cellAddress].s = DATA_CELL_STYLE;
        }
        // Percentage columns (genomsnittsmarginal and andel av total)
        else if (colIndex === 5 || colIndex === 6) {
          // Force percentage formatting
          worksheet[cellAddress].s = {
            numFmt: "0.00%",
            font: { size: 10, color: { rgb: "1F2937" } },
            fill: { fgColor: { rgb: "FEF3C7" } }, // Light yellow to make it obvious
            alignment: { horizontal: "right", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "F59E0B" } },
              bottom: { style: "thin", color: { rgb: "F59E0B" } },
              left: { style: "thin", color: { rgb: "F59E0B" } },
              right: { style: "thin", color: { rgb: "F59E0B" } }
            }
          };
          
          // Also ensure the cell value is treated as a number
          if (typeof cell === 'number') {
            worksheet[cellAddress].t = 'n'; // Force number type
            worksheet[cellAddress].v = cell; // Ensure value is set
          }
        }
        // Currency columns (omsättning, marginal, antal)
        else {
          worksheet[cellAddress].s = DATA_CELL_STYLE;
        }
      }
    });
  });
  
  // Add row heights for better visibility
  if (!worksheet['!rows']) worksheet['!rows'] = [];
  worksheet['!rows'][0] = { hpt: 30 }; // Title row
  worksheet['!rows'][1] = { hpt: 20 }; // Subtitle row
  worksheet['!rows'][3] = { hpt: 25 }; // Header row
}
