import { Deal, KPIData, MonthlyForecast, ForecastByCategory, ForecastCategory, ForecastCategorization, CategorizedForecast } from '@/types';

/**
 * Calculate margin USD from sell price and margin percentage
 */
export function calculateMarginUSD(sellUSD: number, marginPct: number): number {
  return sellUSD * marginPct;
}

/**
 * Calculate cost from sell price and margin percentage
 */
export function calculateCostUSD(sellUSD: number, marginPct: number): number {
  return sellUSD * (1 - marginPct);
}

/**
 * Calculate weighted margin for forecasting
 */
export function calculateWeightedMargin(marginUSD: number, probability: number): number {
  return marginUSD * probability;
}

/**
 * Calculate weighted revenue for forecasting
 */
export function calculateWeightedRevenue(sellUSD: number, probability: number): number {
  return sellUSD * probability;
}

/**
 * Calculate KPIs from deals array
 */
export function calculateKPIs(deals: Deal[]): KPIData {
  const openDeals = deals.filter(deal => deal.status !== 'won' && deal.status !== 'lost');
  const wonDeals = deals.filter(deal => deal.status === 'won');
  
  // Vunna affärer (faktiska resultat)
  const totalRevenue = wonDeals.reduce((sum, deal) => sum + deal.sellUSD, 0);
  const totalCost = wonDeals.reduce((sum, deal) => sum + calculateCostUSD(deal.sellUSD, deal.marginPct), 0);
  const grossMarginUSD = totalRevenue - totalCost;
  const grossMarginPct = totalRevenue > 0 ? grossMarginUSD / totalRevenue : 0;
  
  // Viktad prognos (sannolikhetsjusterat)
  const weightedMarginUSD = openDeals.reduce(
    (sum, deal) => sum + calculateWeightedMargin(deal.marginUSD, deal.probability),
    0
  );
  const weightedRevenueUSD = openDeals.reduce(
    (sum, deal) => sum + calculateWeightedRevenue(deal.sellUSD, deal.probability),
    0
  );
  
  // Best Case scenario (alla affärer vinns)
  const totalPipelineValue = openDeals.reduce((sum, deal) => sum + deal.sellUSD, 0);
  const totalPipelineMargin = openDeals.reduce((sum, deal) => sum + deal.marginUSD, 0);
  
  // Best Case = Vunna + Alla pipeline-affärer
  const bestCaseRevenueUSD = totalRevenue + totalPipelineValue;
  const bestCaseMarginUSD = grossMarginUSD + totalPipelineMargin;
  
  return {
    totalRevenue,
    totalCost,
    grossMarginUSD,
    grossMarginPct,
    weightedMarginUSD,
    weightedRevenueUSD,
    bestCaseRevenueUSD,
    bestCaseMarginUSD,
    totalPipelineValue,
    totalPipelineMargin,
  };
}

/**
 * Calculate monthly forecast from deals
 */
export function calculateMonthlyForecast(deals: Deal[]): MonthlyForecast[] {
  const openDeals = deals.filter(deal => deal.status !== 'won' && deal.status !== 'lost');
  
  const monthlyData = new Map<string, {
    weightedMarginUSD: number;
    weightedRevenueUSD: number;
    dealCount: number;
  }>();
  
  openDeals.forEach(deal => {
    const month = deal.expectedCloseMonth;
    const existing = monthlyData.get(month) || {
      weightedMarginUSD: 0,
      weightedRevenueUSD: 0,
      dealCount: 0,
    };
    
    monthlyData.set(month, {
      weightedMarginUSD: existing.weightedMarginUSD + calculateWeightedMargin(deal.marginUSD, deal.probability),
      weightedRevenueUSD: existing.weightedRevenueUSD + calculateWeightedRevenue(deal.sellUSD, deal.probability),
      dealCount: existing.dealCount + 1,
    });
  });
  
  return Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      month,
      ...data,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calculate forecast by manufacturer
 */
export function calculateForecastByManufacturer(
  deals: Deal[],
  manufacturers: Map<string, string>
): ForecastByCategory[] {
  const openDeals = deals.filter(deal => deal.status !== 'won' && deal.status !== 'lost');
  
  const manufacturerData = new Map<string, {
    weightedMarginUSD: number;
    weightedRevenueUSD: number;
    dealCount: number;
  }>();
  
  openDeals.forEach(deal => {
    const manufacturerId = deal.manufacturerId;
    const existing = manufacturerData.get(manufacturerId) || {
      weightedMarginUSD: 0,
      weightedRevenueUSD: 0,
      dealCount: 0,
    };
    
    manufacturerData.set(manufacturerId, {
      weightedMarginUSD: existing.weightedMarginUSD + calculateWeightedMargin(deal.marginUSD, deal.probability),
      weightedRevenueUSD: existing.weightedRevenueUSD + calculateWeightedRevenue(deal.sellUSD, deal.probability),
      dealCount: existing.dealCount + 1,
    });
  });
  
  return Array.from(manufacturerData.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: manufacturers.get(categoryId) || 'Unknown',
      ...data,
    }))
    .sort((a, b) => b.weightedMarginUSD - a.weightedMarginUSD);
}

/**
 * Calculate forecast by reseller
 */
export function calculateForecastByReseller(
  deals: Deal[],
  resellers: Map<string, string>
): ForecastByCategory[] {
  const openDeals = deals.filter(deal => deal.status !== 'won' && deal.status !== 'lost');
  
  const resellerData = new Map<string, {
    weightedMarginUSD: number;
    weightedRevenueUSD: number;
    dealCount: number;
  }>();
  
  openDeals.forEach(deal => {
    const resellerId = deal.resellerId;
    const existing = resellerData.get(resellerId) || {
      weightedMarginUSD: 0,
      weightedRevenueUSD: 0,
      dealCount: 0,
    };
    
    resellerData.set(resellerId, {
      weightedMarginUSD: existing.weightedMarginUSD + calculateWeightedMargin(deal.marginUSD, deal.probability),
      weightedRevenueUSD: existing.weightedRevenueUSD + calculateWeightedRevenue(deal.sellUSD, deal.probability),
      dealCount: existing.dealCount + 1,
    });
  });
  
  return Array.from(resellerData.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: resellers.get(categoryId) || 'Unknown',
      ...data,
    }))
    .sort((a, b) => b.weightedMarginUSD - a.weightedMarginUSD);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(percentage: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percentage);
}

/**
 * Categorize a deal based on status and probability
 */
export function categorizeDeal(deal: Deal): ForecastCategory {
  // Skip won/lost deals - they're not part of forecast
  if (deal.status === 'won' || deal.status === 'lost') {
    return 'committed'; // This shouldn't be used, but needed for type safety
  }
  
  // Committed: Very high probability deals (90%+) or verbal agreements
  if (deal.probability >= 0.9 || (deal.status === 'verbal' && deal.probability >= 0.8)) {
    return 'committed';
  }
  
  // Best Case: Medium-high probability deals (70%+) or proposals
  if (deal.probability >= 0.7 || deal.status === 'proposal') {
    return 'best-case';
  }
  
  // Worst Case: Lower probability deals
  return 'worst-case';
}

/**
 * Get forecast categorization metadata
 */
export function getForecastCategorizations(): Record<ForecastCategory, ForecastCategorization> {
  return {
    'committed': {
      category: 'committed',
      label: 'Committed',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    },
    'best-case': {
      category: 'best-case',
      label: 'Best Case',
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
    },
    'worst-case': {
      category: 'worst-case',
      label: 'Worst Case',
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
    },
  };
}

/**
 * Calculate forecast by category (committed, best-case, worst-case)
 */
export function calculateCategorizedForecast(deals: Deal[]): CategorizedForecast[] {
  const openDeals = deals.filter(deal => deal.status !== 'won' && deal.status !== 'lost');
  const categorizations = getForecastCategorizations();
  
  const categoryData = new Map<ForecastCategory, {
    weightedMarginUSD: number;
    weightedRevenueUSD: number;
    dealCount: number;
    deals: Deal[];
  }>();

  // Initialize categories
  Object.keys(categorizations).forEach(category => {
    categoryData.set(category as ForecastCategory, {
      weightedMarginUSD: 0,
      weightedRevenueUSD: 0,
      dealCount: 0,
      deals: [],
    });
  });

  // Categorize and aggregate deals
  openDeals.forEach(deal => {
    const category = categorizeDeal(deal);
    const existing = categoryData.get(category)!;
    
    categoryData.set(category, {
      weightedMarginUSD: existing.weightedMarginUSD + calculateWeightedMargin(deal.marginUSD, deal.probability),
      weightedRevenueUSD: existing.weightedRevenueUSD + calculateWeightedRevenue(deal.sellUSD, deal.probability),
      dealCount: existing.dealCount + 1,
      deals: [...existing.deals, deal],
    });
  });

  return Array.from(categoryData.entries()).map(([category, data]) => ({
    category,
    label: categorizations[category].label,
    ...data,
  })).sort((a, b) => {
    // Sort by priority: committed, best-case, worst-case
    const order = ['committed', 'best-case', 'worst-case'];
    return order.indexOf(a.category) - order.indexOf(b.category);
  });
}
