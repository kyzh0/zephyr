import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Search, AlertCircle, SquareArrowOutUpRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { AdminDonationsPanel } from '@/pages/AdminDonationsPanel';

import { getMinutesAgo } from '@/lib/utils';
import { useStations, useWebcams, useSites, useLandings, useSoundings, useClients } from '@/hooks';

function getLastThreeMonths(): string[] {
  const now = new Date();
  return [2, 1, 0].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
}

const STALE_CHECK_TIMESTAMP = Date.now();
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function filterAndSort<T extends { name: string; isDisabled?: boolean }>(
  items: T[],
  search: string
): T[] {
  if (!items?.length) return [];

  let filtered = items;
  if (search.trim()) {
    const query = search.toLowerCase();
    filtered = filtered.filter((item) => item.name.toLowerCase().includes(query));
  }
  return [...filtered].sort((a, b) => {
    const disabledDiff = Number(Boolean(a.isDisabled)) - Number(Boolean(b.isDisabled));
    if (disabledDiff !== 0) return disabledDiff;
    return a.name.localeCompare(b.name);
  });
}

interface AdminDashboardProps {
  tab?: 'stations' | 'webcams' | 'soundings' | 'sites' | 'landings' | 'donations' | 'clients';
}

export default function AdminDashboard({ tab = 'stations' }: AdminDashboardProps) {
  const navigate = useNavigate();

  const [stationSearch, setStationSearch] = useState('');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [webcamSearch, setWebcamSearch] = useState('');
  const [soundingSearch, setSoundingSearch] = useState('');
  const [siteSearch, setSiteSearch] = useState('');
  const [landingSearch, setLandingSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  const { stations, isLoading: stationsLoading } = useStations({ includeDisabled: true });
  const { webcams, isLoading: webcamsLoading } = useWebcams({ includeDisabled: true });
  const { soundings, isLoading: soundingsLoading } = useSoundings();
  const { sites } = useSites({ includeDisabled: true });
  const { landings } = useLandings({ includeDisabled: true });
  const { clients, isLoading: clientsLoading } = useClients();

  const filteredStations = useMemo(() => {
    if (showErrorsOnly) {
      const query = stationSearch.trim().toLowerCase();
      return stations
        .filter(
          (s) => (s.isOffline || s.isError) && (!query || s.name.toLowerCase().includes(query))
        )
        .sort((a, b) => {
          const disabledDiff = Number(Boolean(a.isDisabled)) - Number(Boolean(b.isDisabled));
          if (disabledDiff !== 0) return disabledDiff;
          const offlineDiff = Number(Boolean(b.isOffline)) - Number(Boolean(a.isOffline));
          if (offlineDiff !== 0) return offlineDiff;
          return a.name.localeCompare(b.name);
        });
    }
    return filterAndSort(stations, stationSearch);
  }, [stations, stationSearch, showErrorsOnly]);

  const errorCount = useMemo(() => {
    return stations.filter((s) => s.isError).length;
  }, [stations]);

  const filteredWebcams = useMemo(
    () => filterAndSort(webcams, webcamSearch),
    [webcams, webcamSearch]
  );

  const filteredSoundings = useMemo(() => {
    if (!soundings.length) return [];
    if (!soundingSearch.trim()) return soundings;
    const query = soundingSearch.toLowerCase();
    return soundings.filter((s) => s.name.toLowerCase().includes(query));
  }, [soundings, soundingSearch]);

  const filteredSites = useMemo(() => filterAndSort(sites, siteSearch), [sites, siteSearch]);

  const filteredLandings = useMemo(
    () => filterAndSort(landings, landingSearch),
    [landings, landingSearch]
  );

  const clientMonths = useMemo(() => getLastThreeMonths(), []);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return [...clients].sort((a, b) => a.name.localeCompare(b.name));
    const query = clientSearch.toLowerCase();
    return [...clients]
      .filter((c) => c.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, clientSearch]);

  const handleSignOut = () => {
    sessionStorage.removeItem('adminKey');
    navigate('/', { replace: true });
  };

  const handleTabChange = (value: string) => {
    if (
      value === 'stations' ||
      value === 'webcams' ||
      value === 'soundings' ||
      value === 'sites' ||
      value === 'landings' ||
      value === 'donations' ||
      value === 'clients'
    ) {
      navigate(`/admin/${value}`, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">
        <Tabs value={tab} onValueChange={handleTabChange} className="h-full">
          <TabsList>
            <TabsTrigger value="stations">Stations</TabsTrigger>
            <TabsTrigger value="webcams">Webcams</TabsTrigger>
            <TabsTrigger value="soundings">Soundings</TabsTrigger>
            <TabsTrigger value="sites">Sites</TabsTrigger>
            <TabsTrigger value="landings">Landings</TabsTrigger>
            <TabsTrigger value="donations">Donations</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          {/* Stations Tab */}
          <TabsContent value="stations" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search stations..."
                  value={stationSearch}
                  onChange={(e) => setStationSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showErrorsOnly ? 'default' : 'outline'}
                  onClick={() => setShowErrorsOnly(!showErrorsOnly)}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {showErrorsOnly ? 'Show All' : `Errors (${errorCount})`}
                </Button>
                <Button onClick={() => navigate('/admin/stations/add')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Station
                </Button>
              </div>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-25">Type</TableHead>
                    <TableHead className="w-25">Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredStations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No stations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStations.map((station) => (
                      <TableRow
                        key={station._id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/stations/${station._id}`)}
                      >
                        <TableCell className="font-medium">{station.name}</TableCell>
                        <TableCell>{station.type}</TableCell>
                        <TableCell>
                          {station.isDisabled ? (
                            <span>Disabled</span>
                          ) : station.isOffline ? (
                            <span className="text-destructive">Offline</span>
                          ) : station.isError ? (
                            <span className="text-orange-600">Error</span>
                          ) : (
                            <span className="text-green-600">OK</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={'ghost'}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(station.externalLink, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            <SquareArrowOutUpRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Webcams Tab */}
          <TabsContent value="webcams" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search webcams..."
                  value={webcamSearch}
                  onChange={(e) => setWebcamSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => navigate('/admin/webcams/add')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Webcam
              </Button>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-25">Type</TableHead>
                    <TableHead className="w-25">Status</TableHead>
                    <TableHead className="w-25">Last Updated</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webcamsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : !filteredWebcams?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No webcams found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWebcams.map((webcam) => (
                      <TableRow
                        key={webcam._id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/webcams/${webcam._id}`)}
                      >
                        <TableCell className="font-medium">{webcam.name}</TableCell>
                        <TableCell>{webcam.type}</TableCell>
                        <TableCell>
                          {webcam.isDisabled ? (
                            <span className="text-foreground">Disabled</span>
                          ) : !webcam.lastUpdate ||
                            STALE_CHECK_TIMESTAMP - new Date(webcam.lastUpdate).getTime() >
                              STALE_THRESHOLD_MS ? (
                            <span className="text-destructive">Error</span>
                          ) : (
                            <span className="text-green-600">OK</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {webcam.lastUpdate
                            ? `${getMinutesAgo(new Date(webcam.lastUpdate))}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(webcam.externalLink, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            <SquareArrowOutUpRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Soundings Tab */}
          <TabsContent value="soundings" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search soundings..."
                  value={soundingSearch}
                  onChange={(e) => setSoundingSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => navigate('/admin/soundings/add')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sounding
              </Button>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-37.5">Rasp ID</TableHead>
                    <TableHead className="w-25">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {soundingsLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredSoundings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        No soundings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSoundings.map((sounding) => {
                      const lastUpdatedImage =
                        sounding.images?.length > 0
                          ? sounding.images.map((s) => new Date(s.time))[sounding.images.length - 1]
                          : null;
                      return (
                        <TableRow
                          key={sounding._id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/admin/soundings/${sounding._id}`)}
                        >
                          <TableCell className="font-medium">{sounding.name}</TableCell>
                          <TableCell>
                            {sounding.raspRegion} - {sounding.raspId}
                          </TableCell>
                          <TableCell>
                            {lastUpdatedImage ? `${getMinutesAgo(lastUpdatedImage)}` : 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Sites Tab */}
          <TabsContent value="sites" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sites..."
                  value={siteSearch}
                  onChange={(e) => setSiteSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => navigate('/admin/sites/add')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Site
              </Button>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-25">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredSites?.length ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        No sites found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSites.map((site) => (
                      <TableRow
                        key={site._id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/sites/${site._id}`)}
                      >
                        <TableCell className="font-medium">{site.name}</TableCell>
                        <TableCell>
                          {site.isDisabled ? (
                            <span>Disabled</span>
                          ) : (
                            <span className="text-green-600">Active</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Landings Tab */}
          <TabsContent value="landings" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search landings..."
                  value={landingSearch}
                  onChange={(e) => setLandingSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => navigate('/admin/landings/add')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Landing
              </Button>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-25">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredLandings?.length ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        No landings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLandings.map((landing) => (
                      <TableRow
                        key={landing._id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/landings/${landing._id}`)}
                      >
                        <TableCell className="font-medium">{landing.name}</TableCell>
                        <TableCell>
                          {landing.isDisabled ? (
                            <span>Disabled</span>
                          ) : (
                            <span className="text-green-600">Active</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Donations Tab */}
          <TabsContent value="donations" className="mt-4">
            <AdminDonationsPanel />
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => navigate('/admin/clients/add')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    {clientMonths.map((m) => (
                      <TableHead key={m} className="w-28 text-right">
                        {formatMonthLabel(m)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={clientMonths.length + 1}
                        className="text-muted-foreground"
                      >
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : !filteredClients.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={clientMonths.length + 1}
                        className="text-muted-foreground"
                      >
                        No clients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow
                        key={client._id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/clients/${client._id}`)}
                      >
                        <TableCell className="font-medium">{client.name}</TableCell>
                        {clientMonths.map((m) => {
                          const entry = client.usage?.find((u) => u.month === m);
                          return (
                            <TableCell key={m} className="text-right tabular-nums">
                              {entry ? entry.apiCalls.toLocaleString() : '—'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
