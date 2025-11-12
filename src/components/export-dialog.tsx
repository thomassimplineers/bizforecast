'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Deal, Manufacturer, Reseller, BDM } from '@/types';
import { exportSimplifiedForecast, exportCommittedForecast } from '@/lib/simplified-export';
import { getDeals, getManufacturers, getResellers, getBDMs } from '@/lib/firestore';
import { Download, RefreshCw, Target } from 'lucide-react';

interface ExportDialogProps {
  deals: Deal[];
  manufacturers: Manufacturer[];
  resellers: Reseller[];
  bdms: BDM[];
}

export function ExportDialog({ deals, manufacturers, resellers, bdms }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [freshData, setFreshData] = useState<{
    deals: Deal[];
    manufacturers: Manufacturer[];
    resellers: Reseller[];
    bdms: BDM[];
  } | null>(null);

  // Refresh data from Firestore to ensure we have the latest
  const refreshData = async (): Promise<{ deals: Deal[]; manufacturers: Manufacturer[]; resellers: Reseller[]; bdms: BDM[]; }> => {
    setRefreshing(true);
    try {
      console.log('🔄 Hämtar senaste data från Firestore...');
      const [dealsData, manufacturersData, resellersData, bdmsData] = await Promise.all([
        getDeals(),
        getManufacturers(),
        getResellers(),
        getBDMs(),
      ]);
      
      console.log(`📊 Laddad data:
        - Affärer: ${dealsData.length}
        - Tillverkare: ${manufacturersData.length}
        - Återförsäljare: ${resellersData.length}
        - BDMs: ${bdmsData.length}`);
      
      // Lista de 5 senaste affärerna för verifiering
      const latest5 = dealsData
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5);
      console.log('🆕 5 senaste affärerna:');
      latest5.forEach(deal => {
        console.log(`  - ${deal.endCustomer} (${deal.sellUSD} USD) - Uppdaterad: ${deal.updatedAt.toLocaleString('sv-SE')}`);
      });
      
      const freshDataObj = {
        deals: dealsData,
        manufacturers: manufacturersData,
        resellers: resellersData,
        bdms: bdmsData,
      };
      setFreshData(freshDataObj);
      console.log(`✅ Data uppdaterad och sparad i state`);
      return freshDataObj; // Return ALL the fresh data
    } catch (error) {
      console.error('❌ Kunde inte uppdatera data:', error);
      alert('Kunde inte hämta senaste data. Använder cachad data.');
      return {
        deals,
        manufacturers,
        resellers,
        bdms
      };
    } finally {
      setRefreshing(false);
    }
  };

  // Use fresh data if available, otherwise use props
  const currentDeals = freshData?.deals || deals;
  const currentManufacturers = freshData?.manufacturers || manufacturers;
  const currentResellers = freshData?.resellers || resellers;
  const currentBdms = freshData?.bdms || bdms;

  const handleExport = async (exportType: string) => {
    setExporting(exportType);
    try {
      // ALWAYS refresh data before exporting to ensure we have the latest
      const freshDataResult = await refreshData();
      
      // Use the FRESH data that was just loaded (from return value, NOT state!)
      // State updates are async, so we MUST use the returned value
      const dataToExport = freshDataResult.deals;
      const manufacturersToExport = freshDataResult.manufacturers;
      const resellersToExport = freshDataResult.resellers;
      const bdmsToExport = freshDataResult.bdms;
      
      console.log(`🚀 Exporterar ${exportType} med ${dataToExport.length} affärer`);
      console.log(`📋 Första 3 affärerna som ska exporteras:`);
      dataToExport.slice(0, 3).forEach((deal, i) => {
        console.log(`  ${i + 1}. ${deal.endCustomer} - ${deal.sellUSD} USD`);
      });
      
      // Export based on type
      if (exportType === 'committed-forecast') {
        exportCommittedForecast(dataToExport, manufacturersToExport);
      } else {
        exportSimplifiedForecast(dataToExport, manufacturersToExport);
      }
      
      console.log(`✅ Export av ${exportType} klar!`);
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert('Export misslyckades. Försök igen.');
    } finally {
      setExporting(null);
    }
  };

  const exportOptions = [
    {
      id: 'committed-forecast',
      title: 'Committed Forecast (≥70%)',
      description: '3 flikar: Matrix med FULL omsättning och marginal (INTE viktad). Endast affärer med ≥70% sannolikhet.',
      icon: Target,
      count: currentDeals.filter(d => d.status !== 'lost' && d.probability >= 0.7).length,
      featured: true,
    },
    {
      id: 'simplified-forecast',
      title: 'Viktad Forecast (Alla)',
      description: '3 flikar: Matrix med viktad omsättning och marginal. Alla öppna affärer (exkl. förlorade).',
      icon: Download,
      count: currentDeals.filter(d => d.status !== 'lost').length,
      featured: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportera Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Exportera Forecast Data</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={refreshData}
              disabled={refreshing}
              className="h-8"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Uppdaterar...' : 'Uppdatera data'}
            </Button>
          </DialogTitle>
          <DialogDescription>
            Välj vilken typ av data du vill exportera. Excel-rapporten ger en komplett översikt medan CSV-filerna är bra för vidare analys.
            {freshData && (
              <span className="block mt-2 text-green-600 font-medium">
                ✓ Data uppdaterad ({currentDeals.length} affärer)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {exportOptions.map((option) => {
            const Icon = option.icon;
            const isExporting = exporting === option.id;
            
            return (
              <Card key={option.id} className={`cursor-pointer hover:bg-muted/50 transition-colors ${option.featured ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-base">{option.title}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {option.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-muted-foreground">
                        {option.count} {option.id === 'excel-report' || option.id === 'all-deals' ? 'affärer' : 
                         option.id === 'monthly-forecast' ? 'månader' : 'poster'}
                      </div>
                      {option.featured && (
                        <div className="text-xs text-blue-600 font-medium">REKOMMENDERAD</div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    onClick={() => handleExport(option.id)}
                    disabled={isExporting || option.count === 0}
                    className="w-full"
                    variant={isExporting ? "secondary" : "default"}
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Exporterar...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Exportera Excel
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="border-t pt-4">
          <div className="text-sm text-muted-foreground">
            <strong>💡 Tips:</strong> 
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li><strong>Committed Forecast:</strong> Visar FULL omsättning (inte viktad) för affärer med ≥70% sannolikhet. Bäst för konservativ planering.</li>
              <li><strong>Viktad Forecast:</strong> Visar viktad omsättning (sellUSD × sannolikhet) för alla öppna affärer. Bäst för realistisk forecast.</li>
            </ul>
            <p className="mt-2">Båda rapporterna har 3 flikar och exkluderar förlorade affärer. Alla belopp är i USD.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
