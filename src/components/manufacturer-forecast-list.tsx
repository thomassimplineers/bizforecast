'use client';

import { Deal, Manufacturer } from '@/types';
import { formatCurrency, formatPercentage } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building2, TrendingUp, Percent, Download, Calendar, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ManufacturerForecastListProps {
  deals: Deal[];
  manufacturers: Manufacturer[];
  excludePastDeals?: boolean;
}

interface ManufacturerForecast {
  manufacturerId: string;
  manufacturerName: string;
  totalRevenue: number;
  totalMargin: number;
  weightedRevenue: number;
  weightedMargin: number;
  averageMarginPct: number;
  dealCount: number;
  deals: Deal[];
}

export function ManufacturerForecastList({ 
  deals, 
  manufacturers, 
  excludePastDeals = true 
}: ManufacturerForecastListProps) {
  const [sortBy, setSortBy] = useState<'revenue' | 'margin' | 'name'>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');

  // Filter deals based on excludePastDeals
  const filterFutureDeals = (deals: Deal[]) => {
    if (!excludePastDeals) return deals;
    const currentMonth = new Date().toISOString().slice(0, 7);
    return deals.filter(deal => deal.expectedCloseMonth >= currentMonth);
  };

  // Filter to open deals only and apply future filter
  const openDeals = deals.filter(deal => deal.status !== 'won' && deal.status !== 'lost');
  const futureFilteredDeals = filterFutureDeals(openDeals);

  // Generate available months and quarters from deals
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    futureFilteredDeals.forEach(deal => {
      months.add(deal.expectedCloseMonth);
    });
    return Array.from(months).sort();
  }, [futureFilteredDeals]);

  const availableQuarters = useMemo(() => {
    const quarters = new Set<string>();
    futureFilteredDeals.forEach(deal => {
      const [year, month] = deal.expectedCloseMonth.split('-');
      const monthNum = parseInt(month);
      const quarter = Math.ceil(monthNum / 3);
      const quarterKey = `${year} Q${quarter}`;
      quarters.add(quarterKey);
    });
    return Array.from(quarters).sort();
  }, [futureFilteredDeals]);

  // Apply month and quarter filters
  const filteredDeals = useMemo(() => {
    let filtered = [...futureFilteredDeals];

    // Apply month filter
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(deal => deal.expectedCloseMonth === selectedMonth);
    }

    // Apply quarter filter
    if (selectedQuarter !== 'all') {
      filtered = filtered.filter(deal => {
        const [year, month] = deal.expectedCloseMonth.split('-');
        const monthNum = parseInt(month);
        const quarter = Math.ceil(monthNum / 3);
        const quarterKey = `${year} Q${quarter}`;
        return quarterKey === selectedQuarter;
      });
    }

    return filtered;
  }, [futureFilteredDeals, selectedMonth, selectedQuarter]);

  // Create manufacturer lookup map
  const manufacturerMap = new Map(manufacturers.map(m => [m.id, m.name]));

  // Calculate forecast per manufacturer
  const manufacturerForecasts: ManufacturerForecast[] = [];
  const forecastMap = new Map<string, ManufacturerForecast>();

  filteredDeals.forEach(deal => {
    const manufacturerId = deal.manufacturerId;
    const manufacturerName = manufacturerMap.get(manufacturerId) || 'Unknown';

    if (!forecastMap.has(manufacturerId)) {
      forecastMap.set(manufacturerId, {
        manufacturerId,
        manufacturerName,
        totalRevenue: 0,
        totalMargin: 0,
        weightedRevenue: 0,
        weightedMargin: 0,
        averageMarginPct: 0,
        dealCount: 0,
        deals: [],
      });
    }

    const forecast = forecastMap.get(manufacturerId)!;
    forecast.deals.push(deal);
    forecast.totalRevenue += deal.sellUSD;
    forecast.totalMargin += deal.marginUSD;
    forecast.weightedRevenue += deal.sellUSD * deal.probability;
    forecast.weightedMargin += deal.marginUSD * deal.probability;
    forecast.dealCount++;
  });

  // Calculate average margin percentage for each manufacturer
  forecastMap.forEach(forecast => {
    if (forecast.totalRevenue > 0) {
      forecast.averageMarginPct = (forecast.totalMargin / forecast.totalRevenue) * 100;
    }
  });

  // Sort forecasts
  const sortedForecasts = Array.from(forecastMap.values()).sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'revenue':
        comparison = a.weightedRevenue - b.weightedRevenue;
        break;
      case 'margin':
        comparison = a.averageMarginPct - b.averageMarginPct;
        break;
      case 'name':
        comparison = a.manufacturerName.localeCompare(b.manufacturerName);
        break;
    }
    
    return sortDirection === 'desc' ? -comparison : comparison;
  });

  // Calculate totals
  const totals = {
    totalRevenue: sortedForecasts.reduce((sum, f) => sum + f.totalRevenue, 0),
    totalMargin: sortedForecasts.reduce((sum, f) => sum + f.totalMargin, 0),
    weightedRevenue: sortedForecasts.reduce((sum, f) => sum + f.weightedRevenue, 0),
    weightedMargin: sortedForecasts.reduce((sum, f) => sum + f.weightedMargin, 0),
    dealCount: sortedForecasts.reduce((sum, f) => sum + f.dealCount, 0),
  };

  const overallAverageMargin = totals.totalRevenue > 0 ? (totals.totalMargin / totals.totalRevenue) * 100 : 0;

  // Format numbers without currency symbol for table (easier Excel copy)
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format month for display
  const formatMonthDisplay = (monthStr: string) => {
    return new Date(monthStr + '-01').toLocaleDateString('sv-SE', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedMonth('all');
    setSelectedQuarter('all');
  };

  const handleSort = (field: 'revenue' | 'margin' | 'name') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Tillverkare',
      'Antal Affärer',
      'Total Omsättning (USD)',
      'Viktad Omsättning (USD)',
      'Total Marginal (USD)',
      'Viktad Marginal (USD)',
      'Genomsnittsmarginal (%)',
      'Andel av Pipeline (%)'
    ];

    const rows = sortedForecasts.map(forecast => {
      const pipelineShare = totals.weightedRevenue > 0 ? (forecast.weightedRevenue / totals.weightedRevenue) * 100 : 0;
      return [
        forecast.manufacturerName,
        forecast.dealCount.toString(),
        forecast.totalRevenue.toFixed(0),
        forecast.weightedRevenue.toFixed(0),
        forecast.totalMargin.toFixed(0),
        forecast.weightedMargin.toFixed(0),
        forecast.averageMarginPct.toFixed(2),
        pipelineShare.toFixed(1)
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tillverkare_forecast_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tillverkare Forecast</h2>
          <p className="text-muted-foreground">
            Pipeline-prognos per tillverkare med omsättning och genomsnittsmarginal
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Exportera CSV</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filter & Tidsperiod</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Månad</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj månad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla månader</SelectItem>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {formatMonthDisplay(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kvartal</label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj kvartal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla kvartal</SelectItem>
                  {availableQuarters.map((quarter) => (
                    <SelectItem key={quarter} value={quarter}>
                      {quarter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Aktiva filter</label>
              <div className="flex items-center space-x-2">
                {(selectedMonth !== 'all' || selectedQuarter !== 'all') && (
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    Rensa filter
                  </Button>
                )}
                {selectedMonth !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    {formatMonthDisplay(selectedMonth)}
                  </Badge>
                )}
                {selectedQuarter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedQuarter}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resultat</label>
              <div className="text-sm text-muted-foreground">
                {filteredDeals.length} affärer från {sortedForecasts.length} tillverkare
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Tillverkare</div>
            </div>
            <div className="text-2xl font-bold">{sortedForecasts.length}</div>
            <div className="text-xs text-muted-foreground">I pipeline</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Total Forecast</div>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totals.weightedRevenue)}</div>
            <div className="text-xs text-muted-foreground">Viktad omsättning</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Genomsnittsmarginal</div>
            </div>
            <div className="text-2xl font-bold">{overallAverageMargin.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Viktad genomsnitt</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Affärer</div>
            </div>
            <div className="text-2xl font-bold">{totals.dealCount}</div>
            <div className="text-xs text-muted-foreground">I pipeline</div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Tillverkare Forecast Lista</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Tillverkare</span>
                    {sortBy === 'name' && (
                      <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right">Antal Affärer</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Viktad Omsättning (USD)</span>
                    {sortBy === 'revenue' && (
                      <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right">Viktad Marginal (USD)</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('margin')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Genomsnittsmarginal</span>
                    {sortBy === 'margin' && (
                      <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right">Andel av Pipeline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedForecasts.map((forecast) => {
                const pipelineShare = totals.weightedRevenue > 0 
                  ? (forecast.weightedRevenue / totals.weightedRevenue) * 100 
                  : 0;

                return (
                  <TableRow key={forecast.manufacturerId} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <span>{forecast.manufacturerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{forecast.dealCount}</TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">
                      {formatNumber(forecast.weightedRevenue)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatNumber(forecast.weightedMargin)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono">
                        {forecast.averageMarginPct.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(pipelineShare, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{pipelineShare.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Totals Row */}
              <TableRow className="border-t-2 bg-muted/20 font-semibold">
                <TableCell className="font-bold">TOTALT</TableCell>
                <TableCell className="text-right">{totals.dealCount}</TableCell>
                <TableCell className="text-right font-bold text-blue-600">
                  {formatNumber(totals.weightedRevenue)}
                </TableCell>
                <TableCell className="text-right font-bold text-green-600">
                  {formatNumber(totals.weightedMargin)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="default" className="font-mono">
                    {overallAverageMargin.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold">100.0%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
