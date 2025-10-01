'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Manufacturer, Reseller, BDM } from '@/types';
import { 
  getManufacturers, 
  getResellers, 
  getBDMs,
  addManufacturer, 
  addReseller, 
  addBDM,
  updateManufacturer, 
  updateReseller, 
  updateBDM,
  deleteManufacturer, 
  deleteReseller,
  deleteBDM
} from '@/lib/firestore';
import { Plus, Edit, Trash2, Building2, Store, Users } from 'lucide-react';

type EntityType = 'manufacturer' | 'reseller' | 'bdm';
interface EditingEntity {
  type: EntityType;
  id?: string;
  name: string;
}

export function ListsPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [bdms, setBdms] = useState<BDM[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<EditingEntity | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<{ type: EntityType; id: string; name: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [manufacturersData, resellersData, bdmsData] = await Promise.all([
        getManufacturers(),
        getResellers(),
        getBDMs(),
      ]);
      setManufacturers(manufacturersData);
      setResellers(resellersData);
      setBdms(bdmsData);
    } catch (error) {
      console.error('Error loading lists data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (type: EntityType) => {
    setEditingEntity({ type, name: '' });
    setDialogOpen(true);
  };

  const handleEdit = (type: EntityType, entity: Manufacturer | Reseller) => {
    setEditingEntity({ type, id: entity.id, name: entity.name });
    setDialogOpen(true);
  };

  const handleDelete = (type: EntityType, id: string, name: string) => {
    setEntityToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!entityToDelete) return;

    const entityLabel = entityToDelete.type === 'manufacturer' ? 'Tillverkaren' : 
                       entityToDelete.type === 'reseller' ? 'Återförsäljaren' : 'BDM:en';
    const entityLabelLower = entityToDelete.type === 'manufacturer' ? 'tillverkaren' : 
                            entityToDelete.type === 'reseller' ? 'återförsäljaren' : 'BDM:en';

    try {
      if (entityToDelete.type === 'manufacturer') {
        await deleteManufacturer(entityToDelete.id);
      } else if (entityToDelete.type === 'reseller') {
        await deleteReseller(entityToDelete.id);
      } else {
        await deleteBDM(entityToDelete.id);
      }
      await loadData();
      alert(`${entityLabel} "${entityToDelete.name}" togs bort framgångsrikt!`);
    } catch (error) {
      console.error(`Error deleting ${entityToDelete.type}:`, error);
      alert(`Kunde inte ta bort ${entityLabelLower}. Kontrollera att den inte används i några affärer.`);
    } finally {
      setDeleteDialogOpen(false);
      setEntityToDelete(null);
    }
  };

  const handleSave = async () => {
    if (!editingEntity || !editingEntity.name.trim()) {
      alert('Namnet kan inte vara tomt.');
      return;
    }

    // Check for duplicate names
    const existingNames = editingEntity.type === 'manufacturer' 
      ? manufacturers.map(m => m.name.toLowerCase())
      : editingEntity.type === 'reseller'
      ? resellers.map(r => r.name.toLowerCase())
      : bdms.map(b => b.name.toLowerCase());
    
    const newName = editingEntity.name.trim().toLowerCase();
    const isUpdate = !!editingEntity.id;
    
    if (!isUpdate && existingNames.includes(newName)) {
      const entityLabel = editingEntity.type === 'manufacturer' ? 'Tillverkaren' : 
                         editingEntity.type === 'reseller' ? 'Återförsäljaren' : 'BDM:en';
      alert(`${entityLabel} "${editingEntity.name.trim()}" finns redan.`);
      return;
    }
    setSaving(true);
    try {
      if (editingEntity.id) {
        // Update existing
        switch (editingEntity.type) {
          case 'manufacturer':
            await updateManufacturer(editingEntity.id, editingEntity.name);
            break;
          case 'reseller':
            await updateReseller(editingEntity.id, editingEntity.name);
            break;
          case 'bdm':
            await updateBDM(editingEntity.id, editingEntity.name);
            break;
        }
      } else {
        // Add new
        switch (editingEntity.type) {
          case 'manufacturer':
            await addManufacturer(editingEntity.name);
            break;
          case 'reseller':
            await addReseller(editingEntity.name);
            break;
          case 'bdm':
            await addBDM(editingEntity.name);
            break;
        }
      }

      setDialogOpen(false);
      setEditingEntity(null);
      await loadData();
      
      // Success message
      const action = editingEntity.id ? 'uppdaterades' : 'lades till';
      const entityType = editingEntity.type === 'manufacturer' ? 'Tillverkaren' : 
                        editingEntity.type === 'reseller' ? 'Återförsäljaren' : 'BDM:en';
      alert(`${entityType} "${editingEntity.name.trim()}" ${action} framgångsrikt!`);
      
    } catch (error) {
      console.error('Error saving entity:', error);
      alert('Ett fel uppstod när data skulle sparas. Försök igen.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Listor</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Listor</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Manufacturers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Tillverkare ({manufacturers.length})</span>
            </CardTitle>
            <Button size="sm" onClick={() => handleAdd('manufacturer')}>
              <Plus className="h-4 w-4 mr-2" />
              Lägg till
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manufacturers.map((manufacturer) => (
                    <TableRow key={manufacturer.id}>
                      <TableCell className="font-medium">
                        {manufacturer.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit('manufacturer', manufacturer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete('manufacturer', manufacturer.id, manufacturer.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {manufacturers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Inga tillverkare har lagts till ännu.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resellers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center space-x-2">
              <Store className="h-5 w-5" />
              <span>Återförsäljare ({resellers.length})</span>
            </CardTitle>
            <Button size="sm" onClick={() => handleAdd('reseller')}>
              <Plus className="h-4 w-4 mr-2" />
              Lägg till
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resellers.map((reseller) => (
                    <TableRow key={reseller.id}>
                      <TableCell className="font-medium">
                        {reseller.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit('reseller', reseller)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete('reseller', reseller.id, reseller.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {resellers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Inga återförsäljare har lagts till ännu.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* BDMs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>BDM ({bdms.length})</span>
            </CardTitle>
            <Button size="sm" onClick={() => handleAdd('bdm')}>
              <Plus className="h-4 w-4 mr-2" />
              Lägg till
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bdms.map((bdm) => (
                    <TableRow key={bdm.id}>
                      <TableCell className="font-medium">
                        {bdm.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit('bdm', bdm)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete('bdm', bdm.id, bdm.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {bdms.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Inga BDM:er har lagts till ännu.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingEntity?.id ? 'Redigera' : 'Lägg till'}{' '}
              {editingEntity?.type === 'manufacturer' ? 'Tillverkare' : 
               editingEntity?.type === 'reseller' ? 'Återförsäljare' : 'BDM'}
            </DialogTitle>
            <DialogDescription>
              {editingEntity?.id 
                ? `Uppdatera namnet på ${editingEntity.type === 'manufacturer' ? 'tillverkaren' : 
                   editingEntity.type === 'reseller' ? 'återförsäljaren' : 'BDM:en'}.`
                : `Lägg till en ny ${editingEntity?.type === 'manufacturer' ? 'tillverkare' : 
                   editingEntity?.type === 'reseller' ? 'återförsäljare' : 'BDM'}.`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Namn</Label>
              <Input
                id="name"
                value={editingEntity?.name || ''}
                onChange={(e) => setEditingEntity(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder={`Namn på ${editingEntity?.type === 'manufacturer' ? 'tillverkaren' : 
                  editingEntity?.type === 'reseller' ? 'återförsäljaren' : 'BDM:en'}`}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Avbryt
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !editingEntity?.name.trim()}
            >
              {saving ? 'Sparar...' : editingEntity?.id ? 'Uppdatera' : 'Lägg till'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bekräfta borttagning</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill ta bort{' '}
              {entityToDelete?.type === 'manufacturer' ? 'tillverkaren' : 
               entityToDelete?.type === 'reseller' ? 'återförsäljaren' : 'BDM:en'}{' '}
              &quot;<strong>{entityToDelete?.name}</strong>&quot;?
              <br /><br />
              <span className="text-red-600">
                Detta kan inte ångras. Kontrollera att den inte används i några affärer.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Avbryt
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDelete}
            >
              Ta bort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
