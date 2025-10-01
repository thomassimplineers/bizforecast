'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Target, TrendingUp, Users, X } from 'lucide-react';

interface WelcomeMessageProps {
  dealCount: number;
}

export function WelcomeMessage({ dealCount }: WelcomeMessageProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed welcome message
    const isDismissed = localStorage.getItem('bizforecast-welcome-dismissed');
    if (isDismissed || dealCount > 0) {
      setDismissed(true);
    }
  }, [dealCount]);

  const handleDismiss = () => {
    localStorage.setItem('bizforecast-welcome-dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-blue-900">Välkommen till BizForecast!</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-blue-800">
          Din forecasting-applikation är nu redo att användas! Här är vad du kan göra:
        </p>
        
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Lägg till affärer</h4>
              <p className="text-sm text-blue-700">
                Börja med att skapa dina första affärer med tillverkare, återförsäljare och marginaler.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Följ prognoser</h4>
              <p className="text-sm text-blue-700">
                Se automatiska prognoser kategoriserade som Committed, Best Case och Worst Case.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Users className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Hantera listor</h4>
              <p className="text-sm text-blue-700">
                Lägg till fler tillverkare och återförsäljare i Listor-sektionen när du behöver.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            ✅ 6 Tillverkare redo
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            ✅ 7 Återförsäljare redo
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            🎯 Redo för dina affärer
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-blue-200">
          <p className="text-sm text-blue-600">
            💡 <strong>Tips:</strong> Läs PRODUCTION-GUIDE.md för fullständig användarguide
          </p>
          <Button onClick={handleDismiss} size="sm">
            Kom igång!
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
