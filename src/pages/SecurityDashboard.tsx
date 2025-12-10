import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BoardNav } from '@/components/BoardNav';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SecurityLog {
  event_type?: string;
  ip_address: string;
  details: string;
  created_at: string;
  type?: string;
  timestamp?: string;
}

interface AdminLog {
  action: string;
  ip: string;
  details: string;
  timestamp: string;
  ip_address?: string;
  created_at?: string;
}

interface BannedIP {
  id: string;
  ip_hash: string;
  reason: string | null;
  banned_at: string;
  expires_at: string | null;
}

const SecurityDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
  const [ddosLogs, setDdosLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'banned' | 'ddos'>('overview');

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_auth');
    if (stored === 'true') {
      setIsAuthenticated(true);
      loadSecurityData();
    }
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await supabase.functions.invoke('security-logs', {
        body: { token },
      });

      if (response.error) throw response.error;

      if (response.data?.data) {
        setSecurityLogs(response.data.data.securityLogs || []);
        setAdminLogs(response.data.data.adminLogs || response.data.data.adminFileLogs || []);
        setBannedIPs(response.data.data.bannedIPs || []);
        setDdosLogs(response.data.data.ddosLogs || []);
      }
    } catch (error) {
      toast({ title: 'Xəta', description: 'Məlumat yüklənə bilmədi', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <BoardNav />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="post-container text-center py-12">
            <h1 className="text-2xl font-bold text-destructive mb-4">Giriş Tələb Olunur</h1>
            <p className="text-muted-foreground mb-6">Bu səhifəyə daxil olmaq üçün admin olmalısınız.</p>
            <Link to="/secret-admin" className="imageboard-button-primary inline-block">
              Admin Paneli
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('az-AZ');
  };

  const getEventTypeColor = (type: string) => {
    if (type.includes('ddos') || type.includes('flood')) return 'text-destructive';
    if (type.includes('rate_limit')) return 'text-orange-500';
    if (type.includes('banned') || type.includes('tor') || type.includes('vpn')) return 'text-red-600';
    if (type.includes('profanity')) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      <BoardNav />
      
      <div className="max-w-6xl mx-auto px-4 py-4">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-primary">Təhlükəsizlik Paneli</h1>
          <div className="flex items-center gap-2">
            <Link to="/secret-admin" className="imageboard-button text-xs">
              Admin Paneli
            </Link>
            <button onClick={loadSecurityData} className="imageboard-button text-xs">
              Yenilə
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-border">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-mono ${activeTab === 'overview' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            Ümumi Baxış
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-mono ${activeTab === 'logs' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            Təhlükəsizlik Loqları
          </button>
          <button
            onClick={() => setActiveTab('banned')}
            className={`px-4 py-2 text-sm font-mono ${activeTab === 'banned' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            Ban Edilmiş IP-lər
          </button>
          <button
            onClick={() => setActiveTab('ddos')}
            className={`px-4 py-2 text-sm font-mono ${activeTab === 'ddos' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            DDOS Cəhdləri
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Yüklənir...</div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="admin-panel">
                  <h3 className="font-bold mb-2">Təhlükəsizlik Hadisələri</h3>
                  <p className="text-3xl font-mono text-primary">{securityLogs.length}</p>
                </div>
                <div className="admin-panel">
                  <h3 className="font-bold mb-2">Ban Edilmiş IP-lər</h3>
                  <p className="text-3xl font-mono text-destructive">{bannedIPs.length}</p>
                </div>
                <div className="admin-panel">
                  <h3 className="font-bold mb-2">DDOS Cəhdləri</h3>
                  <p className="text-3xl font-mono text-orange-500">{ddosLogs.length}</p>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <section className="admin-panel">
                <h2 className="font-bold mb-2">Təhlükəsizlik Loqları</h2>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {securityLogs.length === 0 ? (
                    <p className="text-muted-foreground">Loq yoxdur</p>
                  ) : (
                    securityLogs.map((log, index) => (
                      <div key={index} className="p-2 bg-background text-xs font-mono">
                        <span className={getEventTypeColor(log.event_type || log.type || '')}>
                          [{log.event_type || log.type || 'unknown'}]
                        </span>
                        <span className="ml-2 text-muted-foreground">
                          {log.ip_address || log.ip || 'unknown'}
                        </span>
                        <span className="ml-2 text-muted-foreground">
                          {formatDate(log.created_at || log.timestamp || '')}
                        </span>
                        {log.details && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {typeof log.details === 'string' ? log.details.substring(0, 100) : JSON.stringify(log.details).substring(0, 100)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {activeTab === 'banned' && (
              <section className="admin-panel">
                <h2 className="font-bold mb-2">Ban Edilmiş IP-lər</h2>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {bannedIPs.length === 0 ? (
                    <p className="text-muted-foreground">Ban edilmiş IP yoxdur</p>
                  ) : (
                    bannedIPs.map((ban) => (
                      <div key={ban.id} className="p-2 bg-background text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-primary">{ban.ip_hash}</span>
                            {ban.reason && (
                              <span className="ml-2 text-muted-foreground">- {ban.reason}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(ban.banned_at)}
                            {ban.expires_at && (
                              <span className="ml-2">Expires: {formatDate(ban.expires_at)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {activeTab === 'ddos' && (
              <section className="admin-panel">
                <h2 className="font-bold mb-2">DDOS Cəhdləri</h2>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {ddosLogs.length === 0 ? (
                    <p className="text-muted-foreground">DDOS cəhdi yoxdur</p>
                  ) : (
                    ddosLogs.map((log, index) => (
                      <div key={index} className="p-2 bg-background text-xs font-mono">
                        <span className="text-destructive">[DDOS]</span>
                        <span className="ml-2 text-muted-foreground">{log.ip || 'unknown'}</span>
                        <span className="ml-2 text-muted-foreground">
                          {formatDate(log.timestamp || '')}
                        </span>
                        {log.details && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {typeof log.details === 'string' ? log.details.substring(0, 100) : JSON.stringify(log.details).substring(0, 100)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Admin Logs Section */}
            <section className="admin-panel mt-4">
              <h2 className="font-bold mb-2">Admin Əməliyyatları</h2>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {adminLogs.length === 0 ? (
                  <p className="text-muted-foreground">Admin loq yoxdur</p>
                ) : (
                  adminLogs.slice(0, 50).map((log, index) => (
                    <div key={index} className="p-2 bg-background text-xs font-mono">
                      <span className="text-primary">[{log.action}]</span>
                      <span className="ml-2 text-muted-foreground">
                        {log.ip || log.ip_address || 'unknown'}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {formatDate(log.timestamp || log.created_at || '')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityDashboard;


