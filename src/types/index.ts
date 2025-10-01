export interface Manufacturer {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reseller {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BDM {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DealStatus = 'prospect' | 'qualified' | 'proposal' | 'verbal' | 'won' | 'lost';

export interface Deal {
  id: string;
  manufacturerId: string;
  resellerId: string;
  endCustomer: string;
  bdmId?: string;
  sellUSD: number;
  marginPct: number; // margin percentage (0.0 - 1.0)
  marginUSD: number; // calculated: sellUSD * marginPct
  probability: number; // 0.0 - 1.0
  status: DealStatus;
  expectedCloseMonth: string; // format "YYYY-MM"
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Helper types for forms and calculations
export interface DealFormData {
  manufacturerId: string;
  resellerId: string;
  endCustomer: string;
  bdmId?: string;
  sellUSD: number;
  marginPct: number;
  probability: number;
  status: DealStatus;
  expectedCloseMonth: string;
  notes?: string;
}

export interface KPIData {
  totalRevenue: number;
  totalCost: number;
  grossMarginUSD: number;
  grossMarginPct: number;
  weightedMarginUSD: number;
  weightedRevenueUSD: number;
  bestCaseRevenueUSD: number;
  bestCaseMarginUSD: number;
  totalPipelineValue: number;
  totalPipelineMargin: number;
}

export interface MonthlyForecast {
  month: string; // "YYYY-MM"
  weightedMarginUSD: number;
  weightedRevenueUSD: number;
  dealCount: number;
}

export interface ForecastByCategory {
  categoryId: string;
  categoryName: string;
  weightedMarginUSD: number;
  weightedRevenueUSD: number;
  dealCount: number;
}

export type ForecastCategory = 'committed' | 'worst-case' | 'best-case';

export interface ForecastCategorization {
  category: ForecastCategory;
  label: string;
  color: string;
  bgColor: string;
}

export interface CategorizedForecast {
  category: ForecastCategory;
  label: string;
  weightedMarginUSD: number;
  weightedRevenueUSD: number;
  dealCount: number;
  deals: Deal[];
}
