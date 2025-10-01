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
import { 
  exportDeals, 
  exportPipelineByManufacturer, 
  exportPipelineByReseller, 
  exportMonthlyForecast,
  exportExcelReport
} from '@/lib/export';
import { Download, FileSpreadsheet, TrendingUp, Users, Calendar } from 'lucide-react';

interface ExportDialogProps {
  deals: Deal[];
  manufacturers: Manufacturer[];
  resellers: Reseller[];
  bdms: BDM[];
}

export function ExportDialog({ deals, manufacturers, resellers, bdms }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (exportType: string, exportFunction: () => void) => {
    setExporting(exportType);
    try {
      exportFunction();
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export misslyckades. Försök igen.');
    } finally {
      setExporting(null);
    }
  };

  const exportOptions = [
    {
      id: 'excel-report',
      title: 'Komplett Excel-Rapport',
      description: 'Professionell rapport med Executive Summary, kvartals- och månadsprognoser, detaljerade affärer och committed deals',
      icon: FileSpreadsheet,
      action: () => exportExcelReport(deals, manufacturers, resellers, bdms),
      count: deals.length,
      featured: true,
    },
    {
      id: 'all-deals',
      title: 'Alla Affärer (CSV)',
      description: 'Detaljerad CSV-export av alla affärer med tillverkare, återförsäljare, marginaler och kategorier',
      icon: FileSpreadsheet,
      action: () => exportDeals(deals, manufacturers, resellers, bdms),
      count: deals.length,
    },
    {
      id: 'manufacturer-pipeline',
      title: 'Pipeline per Tillverkare',
      description: 'Sammanfattning av pipeline och prognoser grupperat per tillverkare',
      icon: Users,
      action: () => exportPipelineByManufacturer(deals, manufacturers),
      count: manufacturers.length,
    },
    {
      id: 'reseller-pipeline',
      title: 'Pipeline per Återförsäljare',
      description: 'Sammanfattning av pipeline och prognoser grupperat per återförsäljare',
      icon: Users,
      action: () => exportPipelineByReseller(deals, resellers),
      count: resellers.length,
    },
    {
      id: 'monthly-forecast',
      title: 'Månadsvis Prognos',
      description: 'Prognos per månad med Committed, Best Case och Worst Case kategorier',
      icon: Calendar,
      action: () => exportMonthlyForecast(deals),
      count: new Set(deals.filter(d => d.status !== 'lost').map(d => d.expectedCloseMonth)).size,
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
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Exportera Pipeline Data</span>
          </DialogTitle>
          <DialogDescription>
            Välj vilken typ av data du vill exportera. Excel-rapporten ger en komplett översikt medan CSV-filerna är bra för vidare analys.
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
                    onClick={() => handleExport(option.id, option.action)}
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
                        {option.id === 'excel-report' ? 'Exportera Excel' : 'Exportera CSV'}
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
            <strong>💡 Tips:</strong> Excel-rapporten innehåller flera flikar med Executive Summary, kvartals-/månadsprognoser och detaljerade affärer. 
            CSV-filerna kan öppnas i Excel, Google Sheets eller andra kalkylprogram. Alla belopp är i USD.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
