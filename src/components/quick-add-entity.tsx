'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addManufacturer, addReseller, addBDM } from '@/lib/firestore';
import { Plus } from 'lucide-react';

interface QuickAddEntityProps {
  type: 'manufacturer' | 'reseller' | 'bdm';
  onAdded?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function QuickAddEntity({ 
  type, 
  onAdded, 
  variant = 'outline', 
  size = 'sm',
  className,
}: QuickAddEntityProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const labels = {
    manufacturer: 'Tillverkare',
    reseller: 'Återförsäljare',
    bdm: 'BDM',
  };
  const entityLabel = labels[type];
  const entityLabelLower = type === 'manufacturer' ? 'tillverkare' : type === 'reseller' ? 'återförsäljare' : 'bdm';

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Namnet kan inte vara tomt.');
      return;
    }

    setSaving(true);
    try {
      if (type === 'manufacturer') {
        await addManufacturer(name.trim());
      } else if (type === 'reseller') {
        await addReseller(name.trim());
      } else {
        await addBDM(name.trim());
      }

      setOpen(false);
      setName('');
      onAdded?.();
      
      alert(`${entityLabel} "${name.trim()}" lades till framgångsrikt!`);
    } catch (error) {
      console.error('Error adding entity:', error);
      alert('Ett fel uppstod när data skulle sparas. Försök igen.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!saving) {
      setOpen(newOpen);
      if (!newOpen) {
        setName('');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Plus className="h-4 w-4 mr-2" />
          Ny {entityLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Lägg till {entityLabel}</DialogTitle>
          <DialogDescription>
            Lägg till en ny {entityLabelLower} som kan användas i affärer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Namn</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Namn på ${entityLabelLower}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving) {
                  handleSave();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Avbryt
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !name.trim()}
          >
            {saving ? 'Sparar...' : 'Lägg till'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
