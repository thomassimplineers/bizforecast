'use client';

import { useState } from 'react';
import { Deal, Manufacturer, Reseller, BDM } from '@/types';
import { formatCurrency, formatPercentage, categorizeDeal, getForecastCategorizations } from '@/lib/calculations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  ChevronRight, 
  ArrowLeft, 
  TrendingUp,
  Calendar,
  Target,
  DollarSign
} from 'lucide-react';

interface DrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: string;
  periodType: 'month' | 'quarter';
  deals: Deal[];
  manufacturers: Map<string, string>;
  resellers: Map<string, string>;
  bdms: Map<string, string>;
  viewMode: 'margin' | 'revenue';
}

type DrillLevel = 'period' | 'manufacturer' | 'deals';

interface ManufacturerBreakdown {
  manufacturerId: string;
  manufacturerName: string;
  deals: Deal[];
  totalValue: number;
  totalMargin: number;
  weightedValue: number;
  weightedMargin: number;
  dealCount: number;
}

export function DrillDownModal({
  open,
  onOpenChange,
  period,
  periodType,
  deals,
  manufacturers,
  resellers,
  bdms,
  viewMode
}: DrillDownModalProps) {
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('period');
  const [selectedManufacturer, setSelectedManufacturer] = useState<ManufacturerBreakdown | null>(null);

  // Filter deals for the selected period
  const periodDeals = deals.filter(deal => {
    if (deal.status === 'won' || deal.status === 'lost') return false;
    
    if (periodType === 'month') {
      return deal.expectedCloseMonth === period;
    } else {
      // Quarter logic
      const [year, month] = deal.expectedCloseMonth.split('-');
      const monthNum = parseInt(month);
      const quarter = Math.ceil(monthNum / 3);
      const quarterKey = `${year} Q${quarter}`;
      return quarterKey === period;
    }
  });

  // Calculate manufacturer breakdown
  const manufacturerMap = new Map<string, ManufacturerBreakdown>();

  periodDeals.forEach(deal => {
    const manufacturerId = deal.manufacturerId;
    const manufacturerName = manufacturers.get(manufacturerId) || 'Unknown';
    
    if (!manufacturerMap.has(manufacturerId)) {
      manufacturerMap.set(manufacturerId, {
        manufacturerId,
        manufacturerName,
        deals: [],
        totalValue: 0,
        totalMargin: 0,
        weightedValue: 0,
        weightedMargin: 0,
        dealCount: 0,
      });
    }

    const breakdown = manufacturerMap.get(manufacturerId)!;
    breakdown.deals.push(deal);
    breakdown.totalValue += deal.sellUSD;
    breakdown.totalMargin += deal.marginUSD;
    breakdown.weightedValue += deal.sellUSD * deal.probability;
    breakdown.weightedMargin += deal.marginUSD * deal.probability;
    breakdown.dealCount++;
  });

  const sortedManufacturers = Array.from(manufacturerMap.values())
    .sort((a, b) => (viewMode === 'margin' ? b.weightedMargin - a.weightedMargin : b.weightedValue - a.weightedValue));

  const formatPeriodTitle = () => {
    if (periodType === 'month') {
      return new Date(period + '-01').toLocaleDateString('sv-SE', { 
        month: 'long', 
        year: 'numeric' 
      });
    }
    return period; // Already formatted for quarters
  };

  const categorizations = getForecastCategorizations();

  const handleBack = () => {
    if (drillLevel === 'deals') {
      setDrillLevel('manufacturer');
      setSelectedManufacturer(null);
    } else if (drillLevel === 'manufacturer') {
      setDrillLevel('period');
    }
  };

  const renderPeriodOverview = () => {
    const totalRevenue = periodDeals.reduce((sum, deal) => sum + (deal.sellUSD * deal.probability), 0);
    const totalMargin = periodDeals.reduce((sum, deal) => sum + (deal.marginUSD * deal.probability), 0);
    const averageMargin = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return (
      <div className="space-y-6">
        {/* Enhanced KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="min-h-[120px]">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium">Period</div>
              </div>
              <div className="text-xl font-bold truncate" title={formatPeriodTitle()}>
                {formatPeriodTitle()}
              </div>
              <div className="text-xs text-muted-foreground">{periodDeals.length} affärer</div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200 bg-blue-50/30 min-h-[120px]">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <div className="text-sm font-medium text-blue-800">Viktad Omsättning</div>
              </div>
              <div className="text-lg font-bold text-blue-900 break-words" title={formatCurrency(totalRevenue)}>
                {formatCurrency(totalRevenue)}
              </div>
              <div className="text-xs text-blue-600">Sannolikhetsjusterad</div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/30 min-h-[120px]">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div className="text-sm font-medium text-green-800">Viktad Marginal</div>
              </div>
              <div className="text-lg font-bold text-green-900 break-words" title={formatCurrency(totalMargin)}>
                {formatCurrency(totalMargin)}
              </div>
              <div className="text-xs text-green-600">Sannolikhetsjusterad</div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/30 min-h-[120px]">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-purple-600" />
                <div className="text-sm font-medium text-purple-800">Genomsnittsmarginal</div>
              </div>
              <div className="text-xl font-bold text-purple-900">{averageMargin.toFixed(1)}%</div>
              <div className="text-xs text-purple-600">Viktad genomsnitt</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Deal Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Alla Affärer - {formatPeriodTitle()}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Klicka på en affär för detaljer
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {periodDeals
                .sort((a, b) => (b.sellUSD * b.probability) - (a.sellUSD * a.probability))
                .map((deal) => {
                  const category = categorizeDeal(deal);
                  const categoryInfo = categorizations[category];
                  const manufacturerName = manufacturers.get(deal.manufacturerId) || 'Unknown';
                  const resellerName = resellers.get(deal.resellerId) || 'Unknown';
                  
                  return (
                    <div 
                      key={deal.id} 
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        // Find manufacturer for this deal
                        const manufacturer = sortedManufacturers.find(m => m.manufacturerId === deal.manufacturerId);
                        if (manufacturer) {
                          setSelectedManufacturer(manufacturer);
                          setDrillLevel('deals');
                        }
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="font-semibold text-lg">{deal.endCustomer}</div>
                          <Badge variant="outline" className={categoryInfo.color}>
                            {categoryInfo.label}
                          </Badge>
                          <Badge variant="secondary">
                            {Math.round(deal.probability * 100)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Tillverkare:</span> {manufacturerName}
                          </div>
                          <div>
                            <span className="font-medium">Återförsäljare:</span> {resellerName}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1 min-w-[140px]">
                        <div className="text-base font-bold text-blue-600 break-words" title={formatCurrency(deal.sellUSD)}>
                          {formatCurrency(deal.sellUSD)}
                        </div>
                        <div className="text-sm text-green-600 font-medium break-words" title={`${formatCurrency(deal.marginUSD)} (${formatPercentage(deal.marginPct)})`}>
                          {formatCurrency(deal.marginUSD)} ({formatPercentage(deal.marginPct)})
                        </div>
                        <div className="text-xs text-muted-foreground break-words" title={`Viktad: ${formatCurrency(deal.sellUSD * deal.probability)}`}>
                          Viktad: {formatCurrency(deal.sellUSD * deal.probability)}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground ml-4" />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderManufacturerDetails = () => {
    if (!selectedManufacturer) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="min-h-[120px]">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium">Tillverkare</div>
              </div>
              <div className="text-lg font-bold truncate" title={selectedManufacturer.manufacturerName}>
                {selectedManufacturer.manufacturerName}
              </div>
            </CardContent>
          </Card>
          
          <Card className="min-h-[120px]">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium">Värde</div>
              </div>
              <div className="text-lg font-bold break-words" title={formatCurrency(viewMode === 'margin' ? selectedManufacturer.weightedMargin : selectedManufacturer.weightedValue)}>
                {formatCurrency(viewMode === 'margin' ? selectedManufacturer.weightedMargin : selectedManufacturer.weightedValue)}
              </div>
              <div className="text-xs text-muted-foreground">
                {viewMode === 'margin' ? 'Viktad marginal' : 'Viktad omsättning'}
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[120px]">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium">Affärer</div>
              </div>
              <div className="text-xl font-bold">{selectedManufacturer.dealCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Affärer</CardTitle>
            <CardDescription>
              Alla affärer för {selectedManufacturer.manufacturerName} i {formatPeriodTitle()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedManufacturer.deals.map((deal) => {
                const category = categorizeDeal(deal);
                const categoryInfo = categorizations[category];
                
                return (
                  <div key={deal.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="font-medium">{deal.endCustomer}</div>
                        <Badge variant="outline" className={categoryInfo.color}>
                          {categoryInfo.label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Återförsäljare: {resellers.get(deal.resellerId) || 'Unknown'}</div>
                        {deal.bdmId && (
                          <div>BDM: {bdms.get(deal.bdmId) || 'Unknown'}</div>
                        )}
                        <div>Status: {deal.status} • Sannolikhet: {Math.round(deal.probability * 100)}%</div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-semibold">
                        {formatCurrency(deal.sellUSD)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatPercentage(deal.marginPct)} marginal
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(viewMode === 'margin' ? deal.marginUSD * deal.probability : deal.sellUSD * deal.probability)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-lg">
            <Calendar className="h-5 w-5" />
            <span className="truncate">
              {drillLevel === 'period' && `${formatPeriodTitle()} - Översikt`}
              {drillLevel === 'manufacturer' && `${selectedManufacturer?.manufacturerName} - ${formatPeriodTitle()}`}
              {drillLevel === 'deals' && `${selectedManufacturer?.manufacturerName} - ${formatPeriodTitle()}`}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {drillLevel === 'period' && `Detaljerad nedbrytning för ${periodType === 'month' ? 'månaden' : 'kvartalet'}`}
            {drillLevel === 'manufacturer' && `Alla affärer för ${selectedManufacturer?.manufacturerName}`}
            {drillLevel === 'deals' && `Alla affärer för ${selectedManufacturer?.manufacturerName}`}
          </DialogDescription>
        </DialogHeader>

        {drillLevel === 'period' && renderPeriodOverview()}
        {(drillLevel === 'manufacturer' || drillLevel === 'deals') && renderManufacturerDetails()}
      </DialogContent>
    </Dialog>
  );
}
