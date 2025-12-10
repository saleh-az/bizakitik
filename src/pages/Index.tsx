import { Link } from 'react-router-dom';
import { useBoards } from '@/hooks/useBoards';
import { BoardNav } from '@/components/BoardNav';
import { ThemeToggle } from '@/components/ThemeToggle';

const Index = () => {
  const { data: boards, isLoading } = useBoards();
  
  return (
    <div className="min-h-screen bg-background">
      <BoardNav />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2 font-serif">
            BizSakitBiriyik
          </h1>
          <p className="text-muted-foreground">
            Azərbaycan internetində üzv olmadan sərbəst danışa biləcəyin nadir yerlərdən biri.
          </p>
          <div className="mt-4">
            <ThemeToggle />
          </div>
        </header>
        
        {/* Board List */}
        <section className="mb-8">
          <h2 className="board-title border-b border-border mb-4">Kategoriyalar</h2>
          
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Yüklənir...</div>
          ) : (
            <div className="grid gap-2">
              {boards?.map((board) => (
                <Link
                  key={board.id}
                  to={`/${board.slug}/`}
                  className="post-container hover:bg-post-highlight transition-colors no-underline block"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-primary font-mono">
                        /{board.slug}/
                      </span>
                      <span className="mx-2">-</span>
                      <span className="font-bold">{board.name}</span>
                      {board.nsfw && (
                        <span className="nsfw-warning ml-2">NSFW</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {board.post_count} post
                    </div>
                  </div>
                  {board.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {board.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
        
        {/* Rules */}
        <section className="post-container">
          <h2 className="board-title border-b border-border">Qaydalar</h2>
          <div className="p-4 text-sm space-y-2">
            <p>1. Sayt içi drama yaratmaq qadağandır.</p>
            <p>2. Şəxsi məlumat paylaşmayın (doxxing qadağandır).</p>
            <p>3. Spam və flood qadağandır.</p>
            <p>4. NSFW məzmun yalnız müvafiq kategoriyalarda paylaşıla bilər.</p>
            <p>5. Reklam qadağandır.</p>
            <p>6. Bütün postlar anonimdir.</p>
            <p>7. Bütün postlar anonimdir.</p>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="text-center mt-8 py-4 text-sm text-muted-foreground border-t border-border">
          <p>Sən sakitbirisən. Elə də davran.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;