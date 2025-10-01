'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Deal, Manufacturer, Reseller, BDM, DealStatus } from '@/types';
import { getDeals, getManufacturers, getResellers, getBDMs, deleteDeal } from '@/lib/firestore';
import { categorizeDeal, getForecastCategorizations, formatCurrency, formatPercentage } from '@/lib/calculations';
import { DealDialog } from '@/components/deal-dialog';
import { QuickAddEntity } from '@/components/quick-add-entity';
import { ExportDialog } from '@/components/export-dialog';
import { Plus, Search, Edit, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Filter } from 'lucide-react';

const statusColors: Record<DealStatus, string> = {
  prospect: 'bg-gray-100 text-gray-800',
  qualified: 'bg-blue-100 text-blue-800',
  proposal: 'bg-yellow-100 text-yellow-800',
  verbal: 'bg-green-100 text-green-800',
  won: 'bg-green-500 text-white',
  lost: 'bg-red-100 text-red-800',
};

const statusLabels: Record<DealStatus, string> = {
  prospect: 'Prospekt',
  qualified: 'Kvalificerad',
  proposal: 'Förslag',
  verbal: 'Muntligt',
  won: 'Vunnen',
  lost: 'Förlorad',
};

export function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [bdms, setBdms] = useState<BDM[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('all');
  const [resellerFilter, setResellerFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [sortField, setSortField] = useState<keyof Deal | 'manufacturer' | 'reseller' | 'bdm' | 'marginPct' | 'category'>('expectedCloseMonth');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterDeals();
  }, [deals, searchTerm, statusFilter, manufacturerFilter, resellerFilter, categoryFilter, sortField, sortDirection]);

  const loadData = async () => {
    try {
      setLoading(true);
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
      console.error('Error loading deals data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDeals = () => {
    let filtered = deals;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(deal =>
        deal.endCustomer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(deal => deal.status === statusFilter);
    }

    // Manufacturer filter
    if (manufacturerFilter !== 'all') {
      filtered = filtered.filter(deal => deal.manufacturerId === manufacturerFilter);
    }

    // Reseller filter
    if (resellerFilter !== 'all') {
      filtered = filtered.filter(deal => deal.resellerId === resellerFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(deal => categorizeDeal(deal) === categoryFilter);
    }

    // Sort the filtered deals
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'manufacturer':
          aValue = getManufacturerName(a.manufacturerId);
          bValue = getManufacturerName(b.manufacturerId);
          break;
        case 'reseller':
          aValue = getResellerName(a.resellerId);
          bValue = getResellerName(b.resellerId);
          break;
        case 'bdm':
          aValue = getBDMName(a.bdmId);
          bValue = getBDMName(b.bdmId);
          break;
        case 'marginPct':
          aValue = a.marginPct;
          bValue = b.marginPct;
          break;
        case 'category':
          aValue = categorizeDeal(a);
          bValue = categorizeDeal(b);
          break;
        case 'sellUSD':
        case 'marginUSD':
        case 'probability':
          aValue = a[sortField];
          bValue = b[sortField];
          break;
        case 'endCustomer':
        case 'status':
        case 'expectedCloseMonth':
          aValue = a[sortField];
          bValue = b[sortField];
          break;
        default:
          aValue = a.expectedCloseMonth;
          bValue = b.expectedCloseMonth;
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Handle number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Fallback comparison
      return 0;
    });

    setFilteredDeals(sorted);
  };

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortableTableHead = ({ field, children, className = '' }: { 
    field: typeof sortField; 
    children: React.ReactNode; 
    className?: string;
  }) => {
    const isActive = sortField === field;
    const getSortIcon = () => {
      if (!isActive) return <ChevronsUpDown className="h-4 w-4" />;
      return sortDirection === 'asc' ? 
        <ChevronUp className="h-4 w-4" /> : 
        <ChevronDown className="h-4 w-4" />;
    };

    return (
      <TableHead 
        className={`cursor-pointer hover:bg-muted/50 select-none ${className}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center space-x-1">
          <span>{children}</span>
          {getSortIcon()}
        </div>
      </TableHead>
    );
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setDealDialogOpen(true);
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (confirm('Är du säker på att du vill ta bort denna affär?')) {
      try {
        await deleteDeal(dealId);
        await loadData(); // Reload data
      } catch (error) {
        console.error('Error deleting deal:', error);
      }
    }
  };

  const handleDealSaved = () => {
    setDealDialogOpen(false);
    setEditingDeal(null);
    loadData(); // Reload data
  };

  const getManufacturerName = (id: string) => {
    return manufacturers.find(m => m.id === id)?.name || 'Unknown';
  };

  const getResellerName = (resellerId: string): string => {
    const reseller = resellers.find(r => r.id === resellerId);
    return reseller ? reseller.name : 'Unknown';
  };

  const getBDMName = (bdmId?: string): string => {
    if (!bdmId) return '—';
    const bdm = bdms.find(b => b.id === bdmId);
    return bdm ? bdm.name : 'Unknown';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Affärer</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="h-64 bg-muted animate-pulse rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Affärer</h1>
        <div className="flex items-center space-x-2">
          <ExportDialog 
            deals={deals} 
            manufacturers={manufacturers} 
            resellers={resellers} 
            bdms={bdms}
          />
          <QuickAddEntity type="manufacturer" onAdded={loadData} />
          <QuickAddEntity type="reseller" onAdded={loadData} />
          <Button onClick={() => setDealDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ny Affär
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filter & Sök</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sök</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök slutkund eller anteckningar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla statusar</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tillverkare</label>
              <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla tillverkare</SelectItem>
                  {manufacturers.map((manufacturer) => (
                    <SelectItem key={manufacturer.id} value={manufacturer.id}>
                      {manufacturer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Återförsäljare</label>
              <Select value={resellerFilter} onValueChange={setResellerFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla återförsäljare</SelectItem>
                  {resellers.map((reseller) => (
                    <SelectItem key={reseller.id} value={reseller.id}>
                      {reseller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla kategorier</SelectItem>
                  {Object.entries(getForecastCategorizations()).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Affärer ({filteredDeals.length} av {deals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field="manufacturer">Tillverkare</SortableTableHead>
                  <SortableTableHead field="reseller">Återförsäljare</SortableTableHead>
                  <SortableTableHead field="endCustomer">Slutkund</SortableTableHead>
                  <SortableTableHead field="bdm">BDM</SortableTableHead>
                  <SortableTableHead field="sellUSD" className="text-right">Försäljning USD</SortableTableHead>
                  <SortableTableHead field="marginPct" className="text-right">Marginal %</SortableTableHead>
                  <SortableTableHead field="marginUSD" className="text-right">Marginal USD</SortableTableHead>
                  <SortableTableHead field="probability" className="text-right">Sannolikhet</SortableTableHead>
                  <SortableTableHead field="expectedCloseMonth">Stängning</SortableTableHead>
                  <SortableTableHead field="status">Status</SortableTableHead>
                  <SortableTableHead field="category">Kategori</SortableTableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">
                      {getManufacturerName(deal.manufacturerId)}
                    </TableCell>
                    <TableCell>{getResellerName(deal.resellerId)}</TableCell>
                    <TableCell>{deal.endCustomer}</TableCell>
                    <TableCell>{getBDMName(deal.bdmId)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(deal.sellUSD)}</TableCell>
                    <TableCell className="text-right">{formatPercentage(deal.marginPct)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(deal.marginUSD)}</TableCell>
                    <TableCell className="text-right">{Math.round(deal.probability * 100)}%</TableCell>
                    <TableCell>{deal.expectedCloseMonth}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[deal.status]}>
                        {statusLabels[deal.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const category = categorizeDeal(deal);
                        const config = getForecastCategorizations()[category];
                        return (
                          <Badge className={`${config.bgColor} ${config.color}`}>
                            {config.label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditDeal(deal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDeal(deal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredDeals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Inga affärer hittades med de valda filtren.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DealDialog
        open={dealDialogOpen}
        onOpenChange={setDealDialogOpen}
        deal={editingDeal}
        manufacturers={manufacturers}
        resellers={resellers}
        bdms={bdms}
        deals={deals}
        onSaved={handleDealSaved}
        onDataUpdated={loadData}
      />
    </div>
  );
}
