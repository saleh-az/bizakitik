import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBoard } from '@/hooks/useBoards';
import { useThreads, useCreateThread } from '@/hooks/useThreads';
import { BoardNav } from '@/components/BoardNav';
import { ThreadPost } from '@/components/ThreadPost';
import { PostForm } from '@/components/PostForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState } from 'react';

const BoardPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: board, isLoading: boardLoading } = useBoard(slug || '');
  const { data: threads, isLoading: threadsLoading } = useThreads(board?.id || '');
  const createThread = useCreateThread();
  const [showForm, setShowForm] = useState(false);
  
  if (boardLoading) {
    return (
      <div className="min-h-screen bg-background">
        <BoardNav />
        <div className="text-center py-8 text-muted-foreground">Yüklənir...</div>
      </div>
    );
  }
  
  if (!board) {
    return (
      <div className="min-h-screen bg-background">
        <BoardNav />
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-destructive">Şöbə tapılmadı</h1>
          <Link to="/" className="text-primary mt-4 inline-block">Ana səhifəyə qayıt</Link>
        </div>
      </div>
    );
  }
  
  const handleCreateThread = async (data: {
    title?: string;
    content: string;
    imageUrl?: string;
    imageName?: string;
    captchaToken?: string;
  }) => {
    const result = await createThread.mutateAsync({
      boardId: board.id,
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      imageName: data.imageName,
      captchaToken: data.captchaToken,
    });
    
    setShowForm(false);
    navigate(`/${slug}/thread/${result.id}`);
  };
  
  return (
    <div className="min-h-screen bg-background">
      <BoardNav />
      
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Board Header */}
        <header className="text-center mb-4">
          <h1 className="text-3xl font-bold text-primary font-serif">
            /{board.slug}/ - {board.name}
          </h1>
          {board.description && (
            <p className="text-muted-foreground">{board.description}</p>
          )}
          {board.nsfw && (
            <span className="nsfw-warning inline-block mt-2">NSFW ŞÖBƏ</span>
          )}
          <div className="mt-2 flex items-center justify-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => setShowForm(!showForm)}
              className="imageboard-button-primary"
            >
              {showForm ? 'Formu Gizlət' : 'Yeni Mövzu'}
            </button>
          </div>
        </header>
        
        {/* New Thread Form */}
        {showForm && (
          <div className="mb-4">
            <PostForm onSubmit={handleCreateThread} isThread />
          </div>
        )}
        
        {/* Threads List */}
        <section>
          {threadsLoading ? (
            <div className="text-center py-4 text-muted-foreground">Mövzular yüklənir...</div>
          ) : threads?.length === 0 ? (
            <div className="post-container text-center py-8">
              <p className="text-muted-foreground">Bu şöbədə hələ heç bir mövzu yoxdur.</p>
              <p className="mt-2">
                <button onClick={() => setShowForm(true)} className="text-primary underline">
                  İlk mövzunu siz yaradın!
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {threads?.map((thread) => (
                <Link
                  key={thread.id}
                  to={`/${slug}/thread/${thread.id}`}
                  className="block no-underline"
                >
                  <ThreadPost thread={thread} isPreview />
                </Link>
              ))}
            </div>
          )}
        </section>
        
        {/* Footer */}
        <footer className="text-center mt-8 py-4 text-sm text-muted-foreground border-t border-border">
          <Link to="/">Ana Səhifə</Link>
          <span className="mx-2">|</span>
          <span>{board.post_count} post</span>
        </footer>
      </div>
    </div>
  );
};

export default BoardPage;