'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Deal, DealFormData, Manufacturer, Reseller, BDM, DealStatus } from '@/types';
import { addDeal, updateDeal } from '@/lib/firestore';
import { calculateMarginUSD, calculateCostUSD, formatCurrency, formatPercentage } from '@/lib/calculations';
import { ExportDialog } from '@/components/export-dialog';
import { QuickAddEntity } from '@/components/quick-add-entity';

interface DealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  manufacturers: Manufacturer[];
  resellers: Reseller[];
  bdms: BDM[];
  deals?: Deal[];
  onSaved: () => void;
  onDataUpdated?: () => void;
}

const statusOptions: { value: DealStatus; label: string }[] = [
  { value: 'prospect', label: 'Prospekt' },
  { value: 'qualified', label: 'Kvalificerad' },
  { value: 'proposal', label: 'Förslag' },
  { value: 'verbal', label: 'Muntligt' },
  { value: 'won', label: 'Vunnen' },
  { value: 'lost', label: 'Förlorad' },
];

const probabilityOptions: { value: number; label: string }[] = [
  { value: 0.1, label: '10% - Tidig prospekt' },
  { value: 0.2, label: '20% - Initial kontakt' },
  { value: 0.3, label: '30% - Kvalificerad lead' },
  { value: 0.4, label: '40% - Behov identifierat' },
  { value: 0.5, label: '50% - Förslag begärt' },
  { value: 0.6, label: '60% - Förslag skickat' },
  { value: 0.7, label: '70% - Förhandling pågår' },
  { value: 0.8, label: '80% - Muntligt godkännande' },
  { value: 0.9, label: '90% - Kontrakt under teckning' },
  { value: 0.95, label: '95% - Nästan säker' },
  { value: 1.0, label: '100% - Vunnen' },
];

export function DealDialog({ open, onOpenChange, deal, manufacturers, resellers, bdms, deals = [], onSaved, onDataUpdated }: DealDialogProps) {
  const [formData, setFormData] = useState<DealFormData>({
    manufacturerId: '',
    resellerId: '',
    endCustomer: '',
    bdmId: '',
    sellUSD: 0,
    marginPct: 0.2,
    probability: 0.5,
    status: 'prospect',
    expectedCloseMonth: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (deal) {
      setFormData({
        manufacturerId: deal.manufacturerId,
        resellerId: deal.resellerId,
        endCustomer: deal.endCustomer,
        bdmId: deal.bdmId || '',
        sellUSD: deal.sellUSD,
        marginPct: deal.marginPct,
        probability: deal.probability,
        status: deal.status,
        expectedCloseMonth: deal.expectedCloseMonth,
        notes: deal.notes || '',
      });
    } else {
      // Reset form for new deal
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const defaultMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
      
      setFormData({
        manufacturerId: '',
        resellerId: '',
        endCustomer: '',
        bdmId: '',
        sellUSD: 0,
        marginPct: 0.2,
        probability: 0.5,
        status: 'prospect',
        expectedCloseMonth: defaultMonth,
        notes: '',
      });
    }
    setErrors({});
  }, [deal, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.manufacturerId) {
      newErrors.manufacturerId = 'Tillverkare är obligatorisk';
    }
    if (!formData.resellerId) {
      newErrors.resellerId = 'Återförsäljare är obligatorisk';
    }
    if (!formData.endCustomer.trim()) {
      newErrors.endCustomer = 'Slutkund är obligatorisk';
    }
    // BDM validation is handled by dropdown selection
    if (formData.sellUSD <= 0) {
      newErrors.sellUSD = 'Försäljningspris måste vara större än 0';
    }
    if (formData.marginPct < 0 || formData.marginPct > 1) {
      newErrors.marginPct = 'Marginal måste vara mellan 0% och 100%';
    }
    if (formData.probability < 0 || formData.probability > 1) {
      newErrors.probability = 'Sannolikhet måste vara mellan 0 och 1';
    }
    if (!formData.expectedCloseMonth) {
      newErrors.expectedCloseMonth = 'Förväntad stängningsmånad är obligatorisk';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (deal) {
        await updateDeal(deal.id, formData);
      } else {
        await addDeal(formData);
      }
      onSaved();
    } catch (error) {
      console.error('Error saving deal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof DealFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const marginUSD = calculateMarginUSD(formData.sellUSD, formData.marginPct);
  const costUSD = calculateCostUSD(formData.sellUSD, formData.marginPct);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {deal ? 'Redigera Affär' : 'Ny Affär'}
              </DialogTitle>
              <DialogDescription>
                {deal ? 'Uppdatera affärsdetaljer nedan.' : 'Fyll i detaljer för den nya affären.'}
              </DialogDescription>
            </div>
            {deals.length > 0 && (
              <ExportDialog 
                deals={deals}
                manufacturers={manufacturers}
                resellers={resellers}
                bdms={bdms}
              />
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="manufacturerId">Tillverkare *</Label>
                <QuickAddEntity 
                  type="manufacturer" 
                  onAdded={onDataUpdated}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                />
              </div>
              <Select 
                value={formData.manufacturerId} 
                onValueChange={(value) => handleInputChange('manufacturerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj tillverkare" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map((manufacturer) => (
                    <SelectItem key={manufacturer.id} value={manufacturer.id}>
                      {manufacturer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.manufacturerId && (
                <p className="text-sm text-red-500">{errors.manufacturerId}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="resellerId">Återförsäljare *</Label>
                <QuickAddEntity 
                  type="reseller" 
                  onAdded={onDataUpdated}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                />
              </div>
              <Select 
                value={formData.resellerId} 
                onValueChange={(value) => handleInputChange('resellerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj återförsäljare" />
                </SelectTrigger>
                <SelectContent>
                  {resellers.map((reseller) => (
                    <SelectItem key={reseller.id} value={reseller.id}>
                      {reseller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.resellerId && (
                <p className="text-sm text-red-500">{errors.resellerId}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endCustomer">Slutkund *</Label>
            <Input
              id="endCustomer"
              value={formData.endCustomer}
              onChange={(e) => handleInputChange('endCustomer', e.target.value)}
              placeholder="Företagsnamn"
            />
            {errors.endCustomer && (
              <p className="text-sm text-red-500">{errors.endCustomer}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bdmId">Westcon BDM</Label>
              <QuickAddEntity 
                type="bdm" 
                onAdded={onDataUpdated}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
              />
            </div>
            <Select 
              value={formData.bdmId || 'none'} 
              onValueChange={(value) => handleInputChange('bdmId', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj BDM (valfritt)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen BDM vald</SelectItem>
                {bdms.map((bdm) => (
                  <SelectItem key={bdm.id} value={bdm.id}>
                    {bdm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bdmId && (
              <p className="text-sm text-red-500">{errors.bdmId}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sellUSD">Försäljningspris USD *</Label>
              <Input
                id="sellUSD"
                type="number"
                min="0"
                step="1"
                value={formData.sellUSD || ''}
                onChange={(e) => handleInputChange('sellUSD', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
              {errors.sellUSD && (
                <p className="text-sm text-red-500">{errors.sellUSD}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="marginPct">Marginal % *</Label>
              <Input
                id="marginPct"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={(formData.marginPct * 100).toFixed(2)}
                onChange={(e) => handleInputChange('marginPct', (parseFloat(e.target.value) || 0) / 100)}
                placeholder="20.50"
              />
              <p className="text-xs text-muted-foreground">
                Marginal i procent (t.ex. 20.50 för 20.50%)
              </p>
              {errors.marginPct && (
                <p className="text-sm text-red-500">{errors.marginPct}</p>
              )}
            </div>
          </div>

          {/* Calculation Display */}
          {formData.sellUSD > 0 && formData.marginPct > 0 && (
            <div className="grid gap-4 md:grid-cols-2 p-3 bg-muted rounded-lg">
              <div>
                <Label className="text-sm text-muted-foreground">Beräknad Marginal USD</Label>
                <p className="text-lg font-semibold">{formatCurrency(marginUSD)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Beräknad Kostnad USD</Label>
                <p className="text-lg font-semibold">{formatCurrency(costUSD)}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="probability">Sannolikhet *</Label>
              <Select 
                value={formData.probability.toString()} 
                onValueChange={(value) => handleInputChange('probability', parseFloat(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj sannolikhet" />
                </SelectTrigger>
                <SelectContent>
                  {probabilityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.probability && (
                <p className="text-sm text-red-500">{errors.probability}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: DealStatus) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedCloseMonth">Förväntad Stängning *</Label>
              <Input
                id="expectedCloseMonth"
                type="month"
                min="2024-01"
                max="2026-12"
                value={formData.expectedCloseMonth}
                onChange={(e) => handleInputChange('expectedCloseMonth', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Välj månad mellan januari 2024 och december 2026
              </p>
              {errors.expectedCloseMonth && (
                <p className="text-sm text-red-500">{errors.expectedCloseMonth}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Valfria anteckningar..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sparar...' : deal ? 'Uppdatera' : 'Skapa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
