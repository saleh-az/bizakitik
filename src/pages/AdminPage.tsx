import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BoardNav } from '@/components/BoardNav';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Captcha } from '@/components/Captcha';
import type { Board, Thread, Post } from '@/lib/types';

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  
  const [boards, setBoards] = useState<Board[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  
  // New board form
  const [newBoardSlug, setNewBoardSlug] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [newBoardNsfw, setNewBoardNsfw] = useState(false);
  
  // Check session
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_auth');
    if (stored === 'true') {
      setIsAuthenticated(true);
    }
  }, []);
  
  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadBoards();
    }
  }, [isAuthenticated]);
  
  useEffect(() => {
    if (selectedBoard) {
      loadThreads(selectedBoard);
    }
  }, [selectedBoard]);
  
  const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (captchaSiteKey && !captchaToken) {
      setCaptchaError(true);
      return;
    }
    
    setLoading(true);
    setCaptchaError(false);
    
    try {
      const response = await supabase.functions.invoke('admin-auth', {
        body: { 
          password,
          captcha_token: captchaToken || undefined,
        },
      });
      
      if (response.error) throw response.error;
      
      if (response.data?.success) {
        sessionStorage.setItem('admin_auth', 'true');
        sessionStorage.setItem('admin_token', response.data.token);
        setIsAuthenticated(true);
        setCaptchaToken(null);
        toast({ title: 'Uğurlu giriş' });
      } else {
        toast({ title: 'Xəta', description: 'Yanlış şifrə', variant: 'destructive' });
        setCaptchaToken(null);
      }
    } catch (error) {
      toast({ title: 'Xəta', description: 'Giriş uğursuz oldu', variant: 'destructive' });
      setCaptchaToken(null);
    } finally {
      setLoading(false);
      setPassword('');
    }
  };
  
  const loadBoards = async () => {
    const { data } = await supabase.from('boards').select('*').order('slug');
    if (data) setBoards(data as Board[]);
  };
  
  const loadThreads = async (boardId: string) => {
    const { data } = await supabase
      .from('threads')
      .select('*')
      .eq('board_id', boardId)
      .order('bumped_at', { ascending: false });
    if (data) setThreads(data as Thread[]);
  };
  
  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('Bu mövzunu silmək istədiyinizə əminsiniz?')) return;
    
    const token = sessionStorage.getItem('admin_token');
    const response = await supabase.functions.invoke('admin-delete', {
      body: { type: 'thread', id: threadId, token },
    });
    
    if (response.error) {
      toast({ title: 'Xəta', description: 'Silmə uğursuz oldu', variant: 'destructive' });
    } else {
      toast({ title: 'Uğurlu', description: 'Mövzu silindi' });
      loadThreads(selectedBoard);
    }
  };
  
  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const token = sessionStorage.getItem('admin_token');
    const response = await supabase.functions.invoke('admin-boards', {
      body: {
        action: 'add',
        token,
        board: {
          slug: newBoardSlug.toLowerCase().replace(/[^a-z0-9]/g, ''),
          name: newBoardName,
          description: newBoardDesc,
          nsfw: newBoardNsfw,
        },
      },
    });
    
    if (response.error) {
      toast({ title: 'Xəta', description: 'Şöbə əlavə edilə bilmədi', variant: 'destructive' });
    } else {
      toast({ title: 'Uğurlu', description: 'Şöbə əlavə edildi' });
      setNewBoardSlug('');
      setNewBoardName('');
      setNewBoardDesc('');
      setNewBoardNsfw(false);
      loadBoards();
    }
  };
  
  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Bu şöbəni və bütün məzmununu silmək istədiyinizə əminsiniz?')) return;
    
    const token = sessionStorage.getItem('admin_token');
    const response = await supabase.functions.invoke('admin-boards', {
      body: { action: 'delete', token, boardId },
    });
    
    if (response.error) {
      toast({ title: 'Xəta', description: 'Silmə uğursuz oldu', variant: 'destructive' });
    } else {
      toast({ title: 'Uğurlu', description: 'Şöbə silindi' });
      loadBoards();
    }
  };
  
  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    sessionStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <BoardNav />
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="admin-panel">
            <h1 className="text-2xl font-bold text-center mb-6">Admin Girişi</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-mono mb-1">Şifrə:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="imageboard-input"
                  placeholder="Admin şifrəsi"
                  required
                />
              </div>
              {captchaSiteKey && (
                <div>
                  <label className="block text-sm font-mono mb-1">Təhlükəsizlik yoxlaması:</label>
                  <Captcha
                    siteKey={captchaSiteKey}
                    onVerify={(token) => {
                      setCaptchaToken(token);
                      setCaptchaError(false);
                    }}
                    onExpire={() => {
                      setCaptchaToken(null);
                    }}
                    onError={() => {
                      setCaptchaToken(null);
                      setCaptchaError(true);
                    }}
                  />
                  {captchaError && (
                    <p className="text-sm text-destructive mt-1">Zəhmət olmasa captcha-nı tamamlayın</p>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="imageboard-button-primary w-full"
              >
                {loading ? 'Giriş edilir...' : 'Giriş'}
              </button>
            </form>
            <p className="text-center mt-4 text-sm text-muted-foreground">
              <Link to="/">Ana səhifəyə qayıt</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <BoardNav />
      
      <div className="max-w-4xl mx-auto px-4 py-4">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-primary">Admin Paneli</h1>
          <div className="flex items-center gap-2">
            <Link to="/secret-admin/security" className="imageboard-button text-xs">
              Təhlükəsizlik Paneli
            </Link>
            <button onClick={handleLogout} className="imageboard-button">
              Çıxış
            </button>
          </div>
        </header>
        
        {/* Add Board Form */}
        <section className="admin-panel mb-4">
          <h2 className="font-bold mb-2">Yeni Şöbə Əlavə Et</h2>
          <form onSubmit={handleAddBoard} className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              value={newBoardSlug}
              onChange={(e) => setNewBoardSlug(e.target.value)}
              className="imageboard-input"
              placeholder="Slug (məs: tech)"
              required
            />
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              className="imageboard-input"
              placeholder="Ad (məs: Texnologiya)"
              required
            />
            <input
              type="text"
              value={newBoardDesc}
              onChange={(e) => setNewBoardDesc(e.target.value)}
              className="imageboard-input"
              placeholder="Təsvir"
            />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={newBoardNsfw}
                  onChange={(e) => setNewBoardNsfw(e.target.checked)}
                />
                NSFW
              </label>
              <button type="submit" className="imageboard-button-primary">
                Əlavə Et
              </button>
            </div>
          </form>
        </section>
        
        {/* Board List */}
        <section className="admin-panel mb-4">
          <h2 className="font-bold mb-2">Kategoriyalar</h2>
          <div className="space-y-1">
            {boards.map((board) => (
              <div key={board.id} className="flex items-center justify-between p-2 bg-background">
                <span>
                  <span className="font-mono text-primary">/{board.slug}/</span>
                  <span className="mx-2">-</span>
                  <span>{board.name}</span>
                  {board.nsfw && <span className="nsfw-warning ml-2">NSFW</span>}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedBoard(board.id)}
                    className="imageboard-button text-xs"
                  >
                    Mövzuları Gör
                  </button>
                  <button
                    onClick={() => handleDeleteBoard(board.id)}
                    className="imageboard-button text-xs text-destructive"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Threads for selected board */}
        {selectedBoard && (
          <section className="admin-panel">
            <h2 className="font-bold mb-2">
              Mövzular ({boards.find(b => b.id === selectedBoard)?.name})
            </h2>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {threads.length === 0 ? (
                <p className="text-muted-foreground">Mövzu yoxdur</p>
              ) : (
                threads.map((thread) => (
                  <div key={thread.id} className="flex items-center justify-between p-2 bg-background text-sm">
                    <div className="flex-1 truncate">
                      <span className="font-mono">No.{thread.post_number}</span>
                      {thread.title && <span className="ml-2 font-bold">{thread.title}</span>}
                      <span className="ml-2 text-muted-foreground truncate">
                        {thread.content.substring(0, 50)}...
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteThread(thread.id)}
                      className="imageboard-button text-xs text-destructive ml-2"
                    >
                      Sil
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminPage;