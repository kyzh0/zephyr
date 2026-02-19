import { useEffect, useMemo, useState } from 'react';
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
import { listStations } from '@/services/station.service';
import { listSoundings } from '@/services/sounding.service';
import { listSites } from '@/services/site.service';
import { listLandings } from '@/services/landing.service';
import { listCams } from '@/services/cam.service';
import type { IStation } from '@/models/station.model';
import type { ISounding } from '@/models/sounding.model';
import type { ICam } from '@/models/cam.model';
import { getMinutesAgo } from '@/lib/utils';
import type { ISite } from '@/models/site.model';
import type { ILanding } from '@/models/landing.model';

interface AdminDashboardProps {
  tab?: 'stations' | 'webcams' | 'soundings' | 'sites' | 'landings';
}

export default function AdminDashboard({ tab = 'stations' }: AdminDashboardProps) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(tab);

  // Stations state
  const [stations, setStations] = useState<IStation[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationSearch, setStationSearch] = useState('');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  // Webcams state
  const [webcams, setWebcams] = useState<ICam[]>([]);
  const [webcamsLoading, setWebcamsLoading] = useState(true);
  const [webcamSearch, setWebcamSearch] = useState('');

  // Soundings state
  const [soundings, setSoundings] = useState<ISounding[]>([]);
  const [soundingsLoading, setSoundingsLoading] = useState(true);
  const [soundingSearch, setSoundingSearch] = useState('');

  // Sites state
  const [sites, setSites] = useState<ISite[]>([]);
  const [siteSearch, setSiteSearch] = useState('');

  // Landings state
  const [landings, setLandings] = useState<ILanding[]>([]);
  const [landingSearch, setLandingSearch] = useState('');

  useEffect(() => {
    async function loadStations() {
      const data = await listStations(true);
      if (data?.length) setStations(data);
      setStationsLoading(false);
    }
    loadStations();
  }, []);

  useEffect(() => {
    async function loadSoundings() {
      const data = await listSoundings();
      if (data?.length) setSoundings(data);
      setSoundingsLoading(false);
    }
    loadSoundings();
  }, []);

  useEffect(() => {
    async function loadSites() {
      const data = await listSites(true);
      if (data?.length) setSites(data);
      setStationsLoading(false);
    }
    loadSites();
  }, []);

  useEffect(() => {
    async function loadLandings() {
      const data = await listLandings(true);
      if (data?.length) setLandings(data);
      setStationsLoading(false);
    }
    loadLandings();
  }, []);

  useEffect(() => {
    async function loadWebcams() {
      const data = await listCams(true);
      if (data) setWebcams(data);
      setWebcamsLoading(false);
    }
    loadWebcams();
  }, []);

  const filteredStations = useMemo(() => {
    if (!stations.length) return [];
    let filtered = stations;
    filtered.sort((a, b) => {
      const disabledDiff = Number(Boolean(a.isDisabled)) - Number(Boolean(b.isDisabled));
      if (disabledDiff !== 0) return disabledDiff;
      return a.name.localeCompare(b.name);
    });

    if (showErrorsOnly) {
      filtered = filtered
        .filter((s) => s.isError)
        .sort((a, b) => {
          const disabledDiff = Number(Boolean(a.isDisabled)) - Number(Boolean(b.isDisabled));
          if (disabledDiff !== 0) return disabledDiff;
          const offlineDiff = Number(Boolean(b.isOffline)) - Number(Boolean(a.isOffline));
          if (offlineDiff !== 0) return offlineDiff;
          return a.name.localeCompare(b.name);
        });
    }
    if (stationSearch.trim()) {
      const query = stationSearch.toLowerCase();
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(query));
    }
    return filtered;
  }, [stations, stationSearch, showErrorsOnly]);

  const errorCount = useMemo(() => {
    return stations.filter((s) => s.isError).length;
  }, [stations]);

  const filteredWebcams = useMemo(() => {
    if (!webcams?.length) return [];
    let filtered = webcams;
    if (webcamSearch.trim()) {
      const query = webcamSearch.toLowerCase();
      filtered = filtered.filter((w) => w.name.toLowerCase().includes(query));
    }
    return filtered.sort((a, b) => {
      const disabledDiff = Number(Boolean(a.isDisabled)) - Number(Boolean(b.isDisabled));
      if (disabledDiff !== 0) return disabledDiff;
      return a.name.localeCompare(b.name);
    });
  }, [webcams, webcamSearch]);

  const filteredSoundings = useMemo(() => {
    if (!soundings.length) return [];
    if (!soundingSearch.trim()) return soundings;
    const query = soundingSearch.toLowerCase();
    return soundings.filter((s) => s.name.toLowerCase().includes(query));
  }, [soundings, soundingSearch]);

  const filteredSites = useMemo(() => {
    if (!sites?.length) return [];

    let filtered = sites;
    if (siteSearch.trim())
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(siteSearch.toLowerCase()));

    return filtered.sort((a, b) => {
      const disabledDiff = Number(Boolean(a.isDisabled)) - Number(Boolean(b.isDisabled));
      if (disabledDiff !== 0) return disabledDiff;
      return a.name.localeCompare(b.name);
    });
  }, [sites, siteSearch]);

  const filteredLandings = useMemo(() => {
    if (!landings?.length) return [];

    let filtered = landings;
    if (landingSearch.trim())
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(landingSearch.toLowerCase()));

    return filtered.sort((a, b) => {
      const disabledDiff = Number(Boolean(a.isDisabled)) - Number(Boolean(b.isDisabled));
      if (disabledDiff !== 0) return disabledDiff;
      return a.name.localeCompare(b.name);
    });
  }, [landings, landingSearch]);

  const handleSignOut = () => {
    sessionStorage.removeItem('adminKey');
    navigate(-1);
  };

  const handleTabChange = (value: string) => {
    if (
      value === 'stations' ||
      value === 'webcams' ||
      value === 'soundings' ||
      value === 'sites' ||
      value === 'landings'
    ) {
      setActiveTab(value);
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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full">
          <TabsList>
            <TabsTrigger value="stations">Stations</TabsTrigger>
            <TabsTrigger value="webcams">Webcams</TabsTrigger>
            <TabsTrigger value="soundings">Soundings</TabsTrigger>
            <TabsTrigger value="sites">Sites</TabsTrigger>
            <TabsTrigger value="landings">Landings</TabsTrigger>
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
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
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
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[100px]">Last Updated</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
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
                          ) : webcam.lastUpdate &&
                            Date.now() - new Date(webcam.lastUpdate).getTime() > 24 * 60 * 60 * 1000 ? (
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
                    <TableHead className="w-[150px]">Rasp ID</TableHead>
                    <TableHead className="w-[100px]">Last Updated</TableHead>
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
                        <TableRow key={sounding.raspId}>
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
                    <TableHead className="w-[100px]">Status</TableHead>
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
                    <TableHead className="w-[100px]">Status</TableHead>
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
        </Tabs>
      </main>
    </div>
  );
}
