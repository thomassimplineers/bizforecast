'use client';

import { useState, useEffect } from 'react';
import { Deal, Manufacturer, Reseller, BDM } from '@/types';
import { getDeals, getManufacturers, getResellers, getBDMs } from '@/lib/firestore';
import { ManufacturerForecastList } from '@/components/manufacturer-forecast-list';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForecastListPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [bdms, setBdms] = useState<BDM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludePastDeals, setExcludePastDeals] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [dealsData, manufacturersData, resellersData, bdmsData] = await Promise.all([
        getDeals(),
        getManufacturers(),
        getResellers(),
        getBDMs(),
      ]);

      setDeals(dealsData);
      setManufacturers(manufacturersData);
      setResellers(resellersData);
      setBdms(bdmsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Kunde inte ladda data. Kontrollera att Firebase-emulatorn körs.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Forecast Lista</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p>Laddar forecast-data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Forecast Lista</h1>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka till Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Forecast Lista</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Pipeline forecast</Badge>
          <Button
            variant={excludePastDeals ? 'default' : 'outline'}
            size="sm"
            onClick={() => setExcludePastDeals(!excludePastDeals)}
            className="text-xs"
          >
            {excludePastDeals ? '📅 Endast framtida' : '📅 Alla månader'}
          </Button>
        </div>
      </div>

      <ManufacturerForecastList 
        deals={deals} 
        manufacturers={manufacturers}
        excludePastDeals={excludePastDeals}
      />
    </div>
  );
}
