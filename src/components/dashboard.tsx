'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Deal, KPIData, MonthlyForecast, ForecastByCategory, CategorizedForecast, Manufacturer, Reseller, BDM } from '@/types';
import { getDeals, getManufacturers, getResellers, getBDMs, getManufacturersMap, getResellersMap, getBDMsMap } from '@/lib/firestore';
import { 
  calculateKPIs, 
  calculateMonthlyForecast, 
  calculateForecastByManufacturer,
  calculateForecastByReseller,
  calculateCategorizedForecast,
  getForecastCategorizations,
  formatCurrency, 
  formatPercentage 
} from '@/lib/calculations';
import { DollarSign, TrendingUp, Target, Percent, BarChart3, Users, Calendar } from 'lucide-react';
import { WelcomeMessage } from '@/components/welcome-message';
import { ExportDialog } from '@/components/export-dialog';
import { DrillDownModal } from '@/components/drill-down-modal';

type ViewMode = 'margin' | 'revenue';
export function Dashboard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [manufacturers, setManufacturers] = useState<Map<string, string>>(new Map());
  const [resellers, setResellers] = useState<Map<string, string>>(new Map());
  const [bdms, setBdms] = useState<Map<string, string>>(new Map());
  const [manufacturersArray, setManufacturersArray] = useState<Manufacturer[]>([]);
  const [resellersArray, setResellersArray] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bdmsArray, setBdmsArray] = useState<BDM[]>([]);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [monthlyForecast, setMonthlyForecast] = useState<MonthlyForecast[]>([]);
  const [quarterlyForecast, setQuarterlyForecast] = useState<{quarter: string; weightedMarginUSD: number; weightedRevenueUSD: number; dealCount: number}[]>([]);
  const [manufacturerForecast, setManufacturerForecast] = useState<ForecastByCategory[]>([]);
  const [resellerForecast, setResellerForecast] = useState<ForecastByCategory[]>([]);
  const [categorizedForecast, setCategorizedForecast] = useState<CategorizedForecast[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('revenue');
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedPeriodType, setSelectedPeriodType] = useState<'month' | 'quarter'>('month');
  const [excludePastDeals, setExcludePastDeals] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Recalculate when excludePastDeals changes
    if (deals.length > 0) {
      const filteredDeals = filterFutureDeals(deals);
      const kpiData = calculateKPIs(filteredDeals);
      const monthlyData = calculateMonthlyForecast(filteredDeals);
      const quarterlyData = calculateQuarterlyForecast(filteredDeals);
      const manufacturerData = calculateForecastByManufacturer(filteredDeals, manufacturers);
      const resellerData = calculateForecastByReseller(filteredDeals, resellers);
      const categorizedData = calculateCategorizedForecast(filteredDeals);

      setKpis(kpiData);
      setMonthlyForecast(monthlyData);
      setQuarterlyForecast(quarterlyData);
      setManufacturerForecast(manufacturerData);
      setResellerForecast(resellerData);
      setCategorizedForecast(categorizedData);
    }
  }, [excludePastDeals, deals, manufacturers, resellers]);

  // Helper function to filter out past deals
  const filterFutureDeals = (deals: Deal[]) => {
    if (!excludePastDeals) return deals;
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    return deals.filter(deal => deal.expectedCloseMonth >= currentMonth);
  };

  // Helper function to calculate quarterly forecast
  const calculateQuarterlyForecast = (deals: Deal[]) => {
    const openDeals = deals.filter(deal => deal.status !== 'won' && deal.status !== 'lost');
    const quarterlyData = new Map<string, {
      quarter: string;
      weightedMarginUSD: number;
      weightedRevenueUSD: number;
      dealCount: number;
    }>();

    openDeals.forEach(deal => {
      const [year, month] = deal.expectedCloseMonth.split('-');
      const monthNum = parseInt(month);
      const quarter = Math.ceil(monthNum / 3);
      const quarterKey = `${year} Q${quarter}`;

      if (!quarterlyData.has(quarterKey)) {
        quarterlyData.set(quarterKey, {
          quarter: quarterKey,
          weightedMarginUSD: 0,
          weightedRevenueUSD: 0,
          dealCount: 0,
        });
      }

      const data = quarterlyData.get(quarterKey)!;
      data.weightedMarginUSD += deal.marginUSD * deal.probability;
      data.weightedRevenueUSD += deal.sellUSD * deal.probability;
      data.dealCount++;
    });

    return Array.from(quarterlyData.values()).sort((a, b) => a.quarter.localeCompare(b.quarter));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [dealsData, manufacturersData, resellersData, bdmsData, manufacturersArrayData, resellersArrayData, bdmsArrayData] = await Promise.all([
        getDeals(),
        getManufacturersMap(),
        getResellersMap(),
        getBDMsMap(),
        getManufacturers(),
        getResellers(),
        getBDMs(),
      ]);

      setDeals(dealsData);
      setManufacturers(manufacturersData);
      setResellers(resellersData);
      setBdms(bdmsData);
      setManufacturersArray(manufacturersArrayData);
      setResellersArray(resellersArrayData);
      setBdmsArray(bdmsArrayData);

      // Filter deals based on excludePastDeals setting
      const filteredDeals = filterFutureDeals(dealsData);

      // Calculate all metrics
      const kpiData = calculateKPIs(filteredDeals);
      const monthlyData = calculateMonthlyForecast(filteredDeals);
      const quarterlyData = calculateQuarterlyForecast(filteredDeals);
      const manufacturerData = calculateForecastByManufacturer(filteredDeals, manufacturersData);
      const resellerData = calculateForecastByReseller(filteredDeals, resellersData);
      const categorizedData = calculateCategorizedForecast(filteredDeals);

      setKpis(kpiData);
      setMonthlyForecast(monthlyData);
      setQuarterlyForecast(quarterlyData);
      setManufacturerForecast(manufacturerData);
      setResellerForecast(resellerData);
      setCategorizedForecast(categorizedData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Kunde inte ladda dashboard-data. Kontrollera att Firebase-emulatorn körs.');
    } finally {
      setLoading(false);
    }
  };

  const handleBarClick = (data: any, periodType: 'month' | 'quarter') => {
    console.log('Bar clicked:', data, periodType); // Debug log
    if (data && data.payload) {
      const period = data.payload.month || data.payload.quarter;
      console.log('Selected period:', period); // Debug log
      setSelectedPeriod(period);
      setSelectedPeriodType(periodType);
      setDrillDownOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={loadData} variant="outline">
            Försök igen
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={loadData}>Ladda om</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Ingen data tillgänglig. Kontrollera att Firebase-emulatorn körs och att data har seedats.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <ExportDialog 
            deals={deals}
            manufacturers={manufacturersArray}
            resellers={resellersArray}
            bdms={bdmsArray}
          />
          <Button
            variant={viewMode === 'margin' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('margin')}
          >
            Marginal
          </Button>
          <Button
            variant={viewMode === 'revenue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('revenue')}
          >
            Omsättning
          </Button>
        </div>
      </div>

      <WelcomeMessage dealCount={deals.length} />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="min-h-[130px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Omsättning</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold break-words leading-tight" title={formatCurrency(kpis.totalRevenue)}>
              {formatCurrency(kpis.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Vunna affärer</p>
          </CardContent>
        </Card>

        <Card className="min-h-[130px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bruttomarginal</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold break-words leading-tight" title={formatCurrency(kpis.grossMarginUSD)}>
              {formatCurrency(kpis.grossMarginUSD)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatPercentage(kpis.grossMarginPct)} marginal
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[130px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viktad Marginal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold break-words leading-tight" title={formatCurrency(kpis.weightedMarginUSD)}>
              {formatCurrency(kpis.weightedMarginUSD)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Pipeline-prognos</p>
          </CardContent>
        </Card>

        <Card className="min-h-[130px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viktad Omsättning</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold break-words leading-tight" title={formatCurrency(kpis.weightedRevenueUSD)}>
              {formatCurrency(kpis.weightedRevenueUSD)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Pipeline-värde</p>
          </CardContent>
        </Card>
      </div>

      {/* Best Case Scenario Cards */}
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold">Best Case Scenario</h2>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Alla potentiella affärer vinns
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Sammanställning av alla potentiella affärer i pipeline. Visar maximal möjlig omsättning och marginal om samtliga affärer skulle vinnas.
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Best Case Omsättning</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{formatCurrency(kpis.bestCaseRevenueUSD)}</div>
              <p className="text-xs text-green-600">
                Vunna + Alla potentiella ({formatCurrency(kpis.totalPipelineValue)})
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Best Case Marginal</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{formatCurrency(kpis.bestCaseMarginUSD)}</div>
              <p className="text-xs text-green-600">
                Vunna + Alla potentiella ({formatCurrency(kpis.totalPipelineMargin)})
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Potentiella Affärer</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{formatCurrency(kpis.totalPipelineValue)}</div>
              <p className="text-xs text-blue-600">Alla öppna affärer sammanlagt</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Genomsnittsmarginal</CardTitle>
              <Percent className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {kpis.totalPipelineValue > 0 
                  ? `${Math.round((kpis.totalPipelineMargin / kpis.totalPipelineValue) * 100)}%`
                  : '0%'
                }
              </div>
              <p className="text-xs text-purple-600">Pipeline-affärer i snitt</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Best Case Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">Sammanställning</span>
          </div>
          <p className="text-sm text-green-700">
            Best Case-scenariot inkluderar <strong>{deals.filter(d => d.status !== 'won' && d.status !== 'lost').length} potentiella affärer</strong> 
            {' '}med ett totalt värde av <strong>{formatCurrency(kpis.totalPipelineValue)}</strong>. 
            Detta representerar den maximala möjliga tillväxten utöver redan vunna affärer.
          </p>
        </div>
      </div>

      {/* Time-based Forecast Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tidsbaserad Prognos</h2>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">Viktad enligt sannolikhet</Badge>
            <Button
              variant={excludePastDeals ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExcludePastDeals(!excludePastDeals)}
              className="text-xs"
            >
              {excludePastDeals ? '📅 Endast framtida' : '📅 Alla månader'}
            </Button>
            <Button
              variant={viewMode === 'margin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('margin')}
            >
              Marginal
            </Button>
            <Button
              variant={viewMode === 'revenue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('revenue')}
            >
              Omsättning
            </Button>
          </div>
        </div>

        {/* Quarterly Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Kvartalsprognos {new Date().getFullYear()}</span>
                <Badge variant="secondary">
                  {viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning'}
                </Badge>
              </div>
              <Badge variant="outline" className="text-xs">
                Klicka för detaljer
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={quarterlyForecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning']}
                  labelFormatter={(label) => `Kvartal: ${label}`}
                />
                <Legend />
                <Bar
                  dataKey={viewMode === 'margin' ? 'weightedMarginUSD' : 'weightedRevenueUSD'}
                  fill="#3b82f6"
                  name={viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning'}
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => handleBarClick(data, 'quarter')}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Forecast - Combined View */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Månadstrend</span>
                  <Badge variant="secondary">
                    {viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning'}
                  </Badge>
                </div>
                <Badge variant="outline" className="text-xs">
                  Klicka för detaljer
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyForecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning']}
                    labelFormatter={(label) => `Månad: ${label}`}
                  />
                  <Bar
                    dataKey={viewMode === 'margin' ? 'weightedMarginUSD' : 'weightedRevenueUSD'}
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name={viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning'}
                    cursor="pointer"
                    onClick={(data) => handleBarClick(data, 'month')}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Månadsdetaljer</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {monthlyForecast.slice(0, 12).map((month, index) => (
                  <div key={month.month} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                        {month.month.split('-')[1]}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {new Date(month.month + '-01').toLocaleDateString('sv-SE', { 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {month.dealCount} affärer
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">
                        {formatCurrency(viewMode === 'margin' ? month.weightedMarginUSD : month.weightedRevenueUSD)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {viewMode === 'margin' ? 'Viktad marginal' : 'Viktad omsättning'}
                      </div>
                    </div>
                  </div>
                ))}
                {monthlyForecast.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Inga månadsdata tillgängliga</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Categorized Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Kategoriserad Prognos</span>
            <Badge variant="secondary">
              {viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {categorizedForecast.map((forecast) => {
              const categorizations = getForecastCategorizations();
              const config = categorizations[forecast.category];
              const value = viewMode === 'margin' ? forecast.weightedMarginUSD : forecast.weightedRevenueUSD;
              
              return (
                <div key={forecast.category} className={`p-4 rounded-lg ${config.bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-semibold ${config.color}`}>{forecast.label}</h3>
                    <Badge variant="outline" className="text-xs">
                      {forecast.dealCount} affärer
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {formatCurrency(value)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {viewMode === 'margin' ? 'Viktad marginal' : 'Viktad omsättning'}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categorizedForecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning']}
                />
                <Bar
                  dataKey={viewMode === 'margin' ? 'weightedMarginUSD' : 'weightedRevenueUSD'}
                  fill="#8884d8"
                  name={viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning'}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Forecasts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Manufacturer Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Per Tillverkare</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={manufacturerForecast.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="categoryName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning']}
                />
                <Bar
                  dataKey={viewMode === 'margin' ? 'weightedMarginUSD' : 'weightedRevenueUSD'}
                  fill="#82ca9d"
                  name={viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning'}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reseller Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Per Återförsäljare</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resellerForecast.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="categoryName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning']}
                />
                <Bar
                  dataKey={viewMode === 'margin' ? 'weightedMarginUSD' : 'weightedRevenueUSD'}
                  fill="#ffc658"
                  name={viewMode === 'margin' ? 'Viktad Marginal' : 'Viktad Omsättning'}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>

    <DrillDownModal
      open={drillDownOpen}
      onOpenChange={setDrillDownOpen}
      period={selectedPeriod}
      periodType={selectedPeriodType}
      deals={filterFutureDeals(deals)}
      manufacturers={manufacturers}
      resellers={resellers}
      bdms={bdms}
      viewMode={viewMode}
    />
    </div>
  );
}
