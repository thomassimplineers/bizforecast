import { Deal, Manufacturer, Reseller, BDM } from '@/types';
import { categorizeDeal, getForecastCategorizations, calculateCostUSD, calculateKPIs } from './calculations';
import * as XLSX from 'xlsx';

/**
 * Convert data to CSV format
 */
function convertToCSV(data: Record<string, unknown>[], headers: string[]): string {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // Handle values that might contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Export all deals with detailed information
 */
export function exportDeals(
  deals: Deal[], 
  manufacturers: Manufacturer[], 
  resellers: Reseller[],
  bdms: BDM[] = []
): void {
  const manufacturerMap = new Map(manufacturers.map(m => [m.id, m.name]));
  const resellerMap = new Map(resellers.map(r => [r.id, r.name]));
  const bdmMap = new Map(bdms.map(b => [b.id, b.name]));
  const categorizations = getForecastCategorizations();

  const exportData = deals.map(deal => {
    const category = categorizeDeal(deal);
    return {
      'Tillverkare': manufacturerMap.get(deal.manufacturerId) || 'Unknown',
      'Återförsäljare': resellerMap.get(deal.resellerId) || 'Unknown',
      'Slutkund': deal.endCustomer,
      'BDM': deal.bdmId ? (bdmMap.get(deal.bdmId) || 'Unknown') : '',
      'Försäljning USD': deal.sellUSD,
      'Marginal %': (deal.marginPct * 100).toFixed(2),
      'Marginal USD': deal.marginUSD,
      'Kostnad USD': Math.round(calculateCostUSD(deal.sellUSD, deal.marginPct)),
      'Sannolikhet %': Math.round(deal.probability * 100),
      'Viktad Marginal USD': Math.round(deal.marginUSD * deal.probability),
      'Viktad Omsättning USD': Math.round(deal.sellUSD * deal.probability),
      'Status': deal.status,
      'Kategori': categorizations[category].label,
      'Förväntad Stängning': deal.expectedCloseMonth,
      'Anteckningar': deal.notes || '',
      'Skapad': deal.createdAt.toISOString().split('T')[0],
      'Uppdaterad': deal.updatedAt.toISOString().split('T')[0],
    };
  });

  const headers = [
    'Tillverkare', 'Återförsäljare', 'Slutkund', 'BDM',
    'Försäljning USD', 'Marginal %', 'Marginal USD', 'Kostnad USD',
    'Sannolikhet %', 'Viktad Marginal USD', 'Viktad Omsättning USD',
    'Status', 'Kategori', 'Förväntad Stängning', 'Anteckningar',
    'Skapad', 'Uppdaterad'
  ];

  const csvContent = convertToCSV(exportData, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csvContent, `bizforecast-deals-${timestamp}.csv`);
}

/**
 * Export pipeline summary by manufacturer
 */
export function exportPipelineByManufacturer(
  deals: Deal[], 
  manufacturers: Manufacturer[]
): void {
  const manufacturerMap = new Map(manufacturers.map(m => [m.id, m.name]));
  const openDeals = deals.filter(deal => deal.status !== 'lost');
  
  const pipelineData = new Map<string, {
    name: string;
    totalDeals: number;
    totalValue: number;
    totalMargin: number;
    weightedMargin: number;
    weightedRevenue: number;
    avgMarginPct: number;
    committed: number;
    bestCase: number;
    worstCase: number;
  }>();

  // Initialize manufacturers
  manufacturers.forEach(manufacturer => {
    pipelineData.set(manufacturer.id, {
      name: manufacturer.name,
      totalDeals: 0,
      totalValue: 0,
      totalMargin: 0,
      weightedMargin: 0,
      weightedRevenue: 0,
      avgMarginPct: 0,
      committed: 0,
      bestCase: 0,
      worstCase: 0,
    });
  });

  // Aggregate data
  openDeals.forEach(deal => {
    const data = pipelineData.get(deal.manufacturerId);
    if (data) {
      const category = categorizeDeal(deal);
      const weightedMargin = deal.marginUSD * deal.probability;
      const weightedRevenue = deal.sellUSD * deal.probability;

      data.totalDeals++;
      data.totalValue += deal.sellUSD;
      data.totalMargin += deal.marginUSD;
      data.weightedMargin += weightedMargin;
      data.weightedRevenue += weightedRevenue;

      if (category === 'committed') data.committed += weightedMargin;
      else if (category === 'best-case') data.bestCase += weightedMargin;
      else data.worstCase += weightedMargin;
    }
  });

  // Calculate averages and format for export
  const exportData = Array.from(pipelineData.values())
    .filter(data => data.totalDeals > 0)
    .map(data => ({
      'Tillverkare': data.name,
      'Antal Affärer': data.totalDeals,
      'Total Omsättning USD': Math.round(data.totalValue),
      'Total Marginal USD': Math.round(data.totalMargin),
      'Viktad Marginal USD': Math.round(data.weightedMargin),
      'Viktad Omsättning USD': Math.round(data.weightedRevenue),
      'Genomsnittlig Marginal %': Math.round((data.totalMargin / data.totalValue) * 100),
      'Committed USD': Math.round(data.committed),
      'Best Case USD': Math.round(data.bestCase),
      'Worst Case USD': Math.round(data.worstCase),
    }));

  const headers = [
    'Tillverkare', 'Antal Affärer', 'Total Omsättning USD', 'Total Marginal USD',
    'Viktad Marginal USD', 'Viktad Omsättning USD', 'Genomsnittlig Marginal %',
    'Committed USD', 'Best Case USD', 'Worst Case USD'
  ];

  const csvContent = convertToCSV(exportData, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csvContent, `bizforecast-pipeline-by-manufacturer-${timestamp}.csv`);
}

/**
 * Export pipeline summary by reseller
 */
export function exportPipelineByReseller(
  deals: Deal[], 
  resellers: Reseller[]
): void {
  const resellerMap = new Map(resellers.map(r => [r.id, r.name]));
  const openDeals = deals.filter(deal => deal.status !== 'lost');
  
  const pipelineData = new Map<string, {
    name: string;
    totalDeals: number;
    totalValue: number;
    totalMargin: number;
    weightedMargin: number;
    weightedRevenue: number;
    avgMarginPct: number;
    committed: number;
    bestCase: number;
    worstCase: number;
  }>();

  // Initialize resellers
  resellers.forEach(reseller => {
    pipelineData.set(reseller.id, {
      name: reseller.name,
      totalDeals: 0,
      totalValue: 0,
      totalMargin: 0,
      weightedMargin: 0,
      weightedRevenue: 0,
      avgMarginPct: 0,
      committed: 0,
      bestCase: 0,
      worstCase: 0,
    });
  });

  // Aggregate data
  openDeals.forEach(deal => {
    const data = pipelineData.get(deal.resellerId);
    if (data) {
      const category = categorizeDeal(deal);
      const weightedMargin = deal.marginUSD * deal.probability;
      const weightedRevenue = deal.sellUSD * deal.probability;

      data.totalDeals++;
      data.totalValue += deal.sellUSD;
      data.totalMargin += deal.marginUSD;
      data.weightedMargin += weightedMargin;
      data.weightedRevenue += weightedRevenue;

      if (category === 'committed') data.committed += weightedMargin;
      else if (category === 'best-case') data.bestCase += weightedMargin;
      else data.worstCase += weightedMargin;
    }
  });

  // Calculate averages and format for export
  const exportData = Array.from(pipelineData.values())
    .filter(data => data.totalDeals > 0)
    .map(data => ({
      'Återförsäljare': data.name,
      'Antal Affärer': data.totalDeals,
      'Total Omsättning USD': Math.round(data.totalValue),
      'Total Marginal USD': Math.round(data.totalMargin),
      'Viktad Marginal USD': Math.round(data.weightedMargin),
      'Viktad Omsättning USD': Math.round(data.weightedRevenue),
      'Genomsnittlig Marginal %': Math.round((data.totalMargin / data.totalValue) * 100),
      'Committed USD': Math.round(data.committed),
      'Best Case USD': Math.round(data.bestCase),
      'Worst Case USD': Math.round(data.worstCase),
    }));

  const headers = [
    'Återförsäljare', 'Antal Affärer', 'Total Omsättning USD', 'Total Marginal USD',
    'Viktad Marginal USD', 'Viktad Omsättning USD', 'Genomsnittlig Marginal %',
    'Committed USD', 'Best Case USD', 'Worst Case USD'
  ];

  const csvContent = convertToCSV(exportData, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csvContent, `bizforecast-pipeline-by-reseller-${timestamp}.csv`);
}

/**
 * Export monthly forecast
 */
export function exportMonthlyForecast(deals: Deal[]): void {
  const openDeals = deals.filter(deal => deal.status !== 'lost');
  const monthlyData = new Map<string, {
    month: string;
    dealCount: number;
    totalValue: number;
    totalMargin: number;
    weightedMargin: number;
    weightedRevenue: number;
    committed: number;
    bestCase: number;
    worstCase: number;
  }>();

  openDeals.forEach(deal => {
    const month = deal.expectedCloseMonth;
    if (!monthlyData.has(month)) {
      monthlyData.set(month, {
        month,
        dealCount: 0,
        totalValue: 0,
        totalMargin: 0,
        weightedMargin: 0,
        weightedRevenue: 0,
        committed: 0,
        bestCase: 0,
        worstCase: 0,
      });
    }

    const data = monthlyData.get(month)!;
    const category = categorizeDeal(deal);
    const weightedMargin = deal.marginUSD * deal.probability;
    const weightedRevenue = deal.sellUSD * deal.probability;

    data.dealCount++;
    data.totalValue += deal.sellUSD;
    data.totalMargin += deal.marginUSD;
    data.weightedMargin += weightedMargin;
    data.weightedRevenue += weightedRevenue;

    if (category === 'committed') data.committed += weightedMargin;
    else if (category === 'best-case') data.bestCase += weightedMargin;
    else data.worstCase += weightedMargin;
  });

  const exportData = Array.from(monthlyData.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(data => ({
      'Månad': data.month,
      'Antal Affärer': data.dealCount,
      'Total Omsättning USD': Math.round(data.totalValue),
      'Total Marginal USD': Math.round(data.totalMargin),
      'Viktad Marginal USD': Math.round(data.weightedMargin),
      'Viktad Omsättning USD': Math.round(data.weightedRevenue),
      'Committed USD': Math.round(data.committed),
      'Best Case USD': Math.round(data.bestCase),
      'Worst Case USD': Math.round(data.worstCase),
    }));

  const headers = [
    'Månad', 'Antal Affärer', 'Total Omsättning USD', 'Total Marginal USD',
    'Viktad Marginal USD', 'Viktad Omsättning USD',
    'Committed USD', 'Best Case USD', 'Worst Case USD'
  ];

  const csvContent = convertToCSV(exportData, headers);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadCSV(csvContent, `bizforecast-monthly-forecast-${timestamp}.csv`);
}

/**
 * Helper function to get quarter from month
 */
function getQuarterFromMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const monthNum = parseInt(month);
  const quarter = Math.ceil(monthNum / 3);
  return `${year} Q${quarter}`;
}

/**
 * Helper function to format currency in Excel
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Export comprehensive Excel report with multiple sheets
 */
export function exportExcelReport(
  deals: Deal[], 
  manufacturers: Manufacturer[], 
  resellers: Reseller[],
  bdms: BDM[] = []
): void {
  const workbook = XLSX.utils.book_new();
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Create maps for lookups
  const manufacturerMap = new Map(manufacturers.map(m => [m.id, m.name]));
  const resellerMap = new Map(resellers.map(r => [r.id, r.name]));
  const bdmMap = new Map(bdms.map(b => [b.id, b.name]));
  const categorizations = getForecastCategorizations();

  // Calculate KPIs
  const kpis = calculateKPIs(deals);
  
  // 1. EXECUTIVE SUMMARY SHEET
  const executiveSummary = [
    ['BizForecast - Executive Summary', '', '', ''],
    ['Rapport genererad:', new Date().toLocaleDateString('sv-SE'), '', ''],
    ['', '', '', ''],
    ['SAMMANFATTNING', '', '', ''],
    ['Total omsättning (vunna):', formatCurrency(kpis.totalRevenue), '', ''],
    ['Total marginal (vunna):', formatCurrency(kpis.grossMarginUSD), '', ''],
    ['Bruttomarginal %:', `${(kpis.grossMarginPct * 100).toFixed(2)}%`, '', ''],
    ['', '', '', ''],
    ['PIPELINE PROGNOS', '', '', ''],
    ['Viktad omsättning:', formatCurrency(kpis.weightedRevenueUSD), '', ''],
    ['Viktad marginal:', formatCurrency(kpis.weightedMarginUSD), '', ''],
    ['', '', '', ''],
    ['BEST CASE SCENARIO', '', '', ''],
    ['Best Case omsättning:', formatCurrency(kpis.bestCaseRevenueUSD), '', ''],
    ['Best Case marginal:', formatCurrency(kpis.bestCaseMarginUSD), '', ''],
    ['Pipeline potential:', formatCurrency(kpis.totalPipelineValue), '', ''],
    ['', '', '', ''],
    ['ANTAL AFFÄRER', '', '', ''],
    ['Totalt antal affärer:', deals.length.toString(), '', ''],
    ['Vunna affärer:', deals.filter(d => d.status === 'won').length.toString(), '', ''],
    ['Öppna affärer:', deals.filter(d => d.status !== 'won' && d.status !== 'lost').length.toString(), '', ''],
    ['Förlorade affärer:', deals.filter(d => d.status === 'lost').length.toString(), '', ''],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(executiveSummary);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

  // 2. QUARTERLY FORECAST SHEET
  const quarterlyData = new Map<string, {
    quarter: string;
    dealCount: number;
    totalValue: number;
    totalMargin: number;
    weightedMargin: number;
    weightedRevenue: number;
    committed: number;
    bestCase: number;
    worstCase: number;
  }>();

  const openDeals = deals.filter(deal => deal.status !== 'won' && deal.status !== 'lost');
  
  openDeals.forEach(deal => {
    const quarter = getQuarterFromMonth(deal.expectedCloseMonth);
    if (!quarterlyData.has(quarter)) {
      quarterlyData.set(quarter, {
        quarter,
        dealCount: 0,
        totalValue: 0,
        totalMargin: 0,
        weightedMargin: 0,
        weightedRevenue: 0,
        committed: 0,
        bestCase: 0,
        worstCase: 0,
      });
    }

    const data = quarterlyData.get(quarter)!;
    const category = categorizeDeal(deal);
    const weightedMargin = deal.marginUSD * deal.probability;
    const weightedRevenue = deal.sellUSD * deal.probability;

    data.dealCount++;
    data.totalValue += deal.sellUSD;
    data.totalMargin += deal.marginUSD;
    data.weightedMargin += weightedMargin;
    data.weightedRevenue += weightedRevenue;

    if (category === 'committed') data.committed += weightedMargin;
    else if (category === 'best-case') data.bestCase += weightedMargin;
    else data.worstCase += weightedMargin;
  });

  const quarterlyExportData = [
    ['KVARTALSPROGNOS', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['Kvartal', 'Antal Affärer', 'Total Omsättning', 'Total Marginal', 'Viktad Omsättning', 'Viktad Marginal', 'Committed', 'Best Case', 'Worst Case'],
    ...Array.from(quarterlyData.values())
      .sort((a, b) => a.quarter.localeCompare(b.quarter))
      .map(data => [
        data.quarter,
        data.dealCount,
        data.totalValue,
        data.totalMargin,
        data.weightedRevenue,
        data.weightedMargin,
        data.committed,
        data.bestCase,
        data.worstCase,
      ])
  ];

  const quarterlySheet = XLSX.utils.aoa_to_sheet(quarterlyExportData);
  XLSX.utils.book_append_sheet(workbook, quarterlySheet, 'Kvartalsprognos');

  // 3. MONTHLY FORECAST SHEET
  const monthlyData = new Map<string, {
    month: string;
    dealCount: number;
    totalValue: number;
    totalMargin: number;
    weightedMargin: number;
    weightedRevenue: number;
    committed: number;
    bestCase: number;
    worstCase: number;
  }>();

  openDeals.forEach(deal => {
    const month = deal.expectedCloseMonth;
    if (!monthlyData.has(month)) {
      monthlyData.set(month, {
        month,
        dealCount: 0,
        totalValue: 0,
        totalMargin: 0,
        weightedMargin: 0,
        weightedRevenue: 0,
        committed: 0,
        bestCase: 0,
        worstCase: 0,
      });
    }

    const data = monthlyData.get(month)!;
    const category = categorizeDeal(deal);
    const weightedMargin = deal.marginUSD * deal.probability;
    const weightedRevenue = deal.sellUSD * deal.probability;

    data.dealCount++;
    data.totalValue += deal.sellUSD;
    data.totalMargin += deal.marginUSD;
    data.weightedMargin += weightedMargin;
    data.weightedRevenue += weightedRevenue;

    if (category === 'committed') data.committed += weightedMargin;
    else if (category === 'best-case') data.bestCase += weightedMargin;
    else data.worstCase += weightedMargin;
  });

  const monthlyExportData = [
    ['MÅNADSPROGNOS', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['Månad', 'Antal Affärer', 'Total Omsättning', 'Total Marginal', 'Viktad Omsättning', 'Viktad Marginal', 'Committed', 'Best Case', 'Worst Case'],
    ...Array.from(monthlyData.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(data => [
        data.month,
        data.dealCount,
        data.totalValue,
        data.totalMargin,
        data.weightedRevenue,
        data.weightedMargin,
        data.committed,
        data.bestCase,
        data.worstCase,
      ])
  ];

  const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyExportData);
  XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Månadsprognos');

  // 4. DETAILED DEALS SHEET
  const dealsExportData = [
    ['DETALJERAD AFFÄRSÖVERSIKT', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Tillverkare', 'Återförsäljare', 'Slutkund', 'BDM', 'Försäljning USD', 'Marginal %', 'Marginal USD', 'Kostnad USD', 'Sannolikhet %', 'Viktad Marginal', 'Viktad Omsättning', 'Status', 'Kategori', 'Förväntad Stängning', 'Kvartal', 'Anteckningar'],
    ...deals.map(deal => {
      const category = categorizeDeal(deal);
      const quarter = getQuarterFromMonth(deal.expectedCloseMonth);
      return [
        manufacturerMap.get(deal.manufacturerId) || 'Unknown',
        resellerMap.get(deal.resellerId) || 'Unknown',
        deal.endCustomer,
        deal.bdmId ? (bdmMap.get(deal.bdmId) || 'Unknown') : '',
        deal.sellUSD,
        (deal.marginPct * 100).toFixed(2) + '%',
        deal.marginUSD,
        Math.round(calculateCostUSD(deal.sellUSD, deal.marginPct)),
        Math.round(deal.probability * 100) + '%',
        Math.round(deal.marginUSD * deal.probability),
        Math.round(deal.sellUSD * deal.probability),
        deal.status,
        categorizations[category].label,
        deal.expectedCloseMonth,
        quarter,
        deal.notes || '',
      ];
    })
  ];

  const dealsSheet = XLSX.utils.aoa_to_sheet(dealsExportData);
  XLSX.utils.book_append_sheet(workbook, dealsSheet, 'Detaljerade Affärer');

  // 5. COMMITTED DEALS SHEET (High probability deals)
  const committedDeals = openDeals.filter(deal => categorizeDeal(deal) === 'committed');
  const committedExportData = [
    ['COMMITTED AFFÄRER (Hög sannolikhet)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Tillverkare', 'Återförsäljare', 'Slutkund', 'BDM', 'Försäljning USD', 'Marginal %', 'Marginal USD', 'Sannolikhet %', 'Viktad Marginal', 'Viktad Omsättning', 'Status', 'Förväntad Stängning', 'Kvartal', 'Anteckningar'],
    ...committedDeals.map(deal => {
      const quarter = getQuarterFromMonth(deal.expectedCloseMonth);
      return [
        manufacturerMap.get(deal.manufacturerId) || 'Unknown',
        resellerMap.get(deal.resellerId) || 'Unknown',
        deal.endCustomer,
        deal.bdmId ? (bdmMap.get(deal.bdmId) || 'Unknown') : '',
        deal.sellUSD,
        (deal.marginPct * 100).toFixed(2) + '%',
        deal.marginUSD,
        Math.round(deal.probability * 100) + '%',
        Math.round(deal.marginUSD * deal.probability),
        Math.round(deal.sellUSD * deal.probability),
        deal.status,
        deal.expectedCloseMonth,
        quarter,
        deal.notes || '',
      ];
    })
  ];

  const committedSheet = XLSX.utils.aoa_to_sheet(committedExportData);
  XLSX.utils.book_append_sheet(workbook, committedSheet, 'Committed Affärer');

  // 6. MANUFACTURER REPORT SHEET
  const manufacturerData = new Map<string, {
    manufacturerName: string;
    totalRevenue: number;
    totalMargin: number;
    weightedRevenue: number;
    weightedMargin: number;
    dealCount: number;
    averageMarginPct: number;
  }>();

  openDeals.forEach(deal => {
    const manufacturerId = deal.manufacturerId;
    const manufacturerName = manufacturerMap.get(manufacturerId) || 'Unknown';
    
    if (!manufacturerData.has(manufacturerId)) {
      manufacturerData.set(manufacturerId, {
        manufacturerName,
        totalRevenue: 0,
        totalMargin: 0,
        weightedRevenue: 0,
        weightedMargin: 0,
        dealCount: 0,
        averageMarginPct: 0,
      });
    }

    const data = manufacturerData.get(manufacturerId)!;
    data.totalRevenue += deal.sellUSD;
    data.totalMargin += deal.marginUSD;
    data.weightedRevenue += deal.sellUSD * deal.probability;
    data.weightedMargin += deal.marginUSD * deal.probability;
    data.dealCount++;
  });

  // Calculate average margin percentage
  manufacturerData.forEach(data => {
    if (data.totalRevenue > 0) {
      data.averageMarginPct = (data.totalMargin / data.totalRevenue) * 100;
    }
  });

  const manufacturerExportData = [
    ['TILLVERKARRAPPORT - PIPELINE FORECAST', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['Tillverkare', 'Antal Affärer', 'Total Omsättning', 'Viktad Omsättning', 'Total Marginal', 'Viktad Marginal', 'Genomsnittsmarginal %', 'Andel av Pipeline %'],
    ...Array.from(manufacturerData.values())
      .sort((a, b) => b.weightedRevenue - a.weightedRevenue)
      .map(data => {
        const totalWeightedRevenue = Array.from(manufacturerData.values()).reduce((sum, d) => sum + d.weightedRevenue, 0);
        const pipelineShare = totalWeightedRevenue > 0 ? (data.weightedRevenue / totalWeightedRevenue) * 100 : 0;
        
        return [
          data.manufacturerName,
          data.dealCount,
          data.totalRevenue,
          data.weightedRevenue,
          data.totalMargin,
          data.weightedMargin,
          data.averageMarginPct.toFixed(2),
          pipelineShare.toFixed(1),
        ];
      })
  ];

  const manufacturerSheet = XLSX.utils.aoa_to_sheet(manufacturerExportData);
  XLSX.utils.book_append_sheet(workbook, manufacturerSheet, 'Tillverkarrapport');

  // Save the workbook
  XLSX.writeFile(workbook, `BizForecast_Rapport_${timestamp}.xlsx`);
}
