import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useBoard } from '@/hooks/useBoards';
import { useThread } from '@/hooks/useThreads';
import { usePosts, useCreatePost } from '@/hooks/usePosts';
import { BoardNav } from '@/components/BoardNav';
import { ThreadPost } from '@/components/ThreadPost';
import { ReplyPost } from '@/components/ReplyPost';
import { PostForm } from '@/components/PostForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState, useEffect, useCallback } from 'react';

const ThreadPage = () => {
  const { slug, threadId } = useParams<{ slug: string; threadId: string }>();
  const [searchParams] = useSearchParams();
  const { data: board } = useBoard(slug || '');
  const { data: thread, isLoading: threadLoading } = useThread(threadId || '');
  const { data: posts, isLoading: postsLoading } = usePosts(threadId || '');
  const createPost = useCreatePost();
  
  const [highlightedPost, setHighlightedPost] = useState<number | null>(null);
  const [quoteText, setQuoteText] = useState('');
  const [showForm, setShowForm] = useState(true);
  
  // Handle initial scroll to post
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const postNumber = parseInt(hash.replace('#p', ''), 10);
      if (!isNaN(postNumber)) {
        setTimeout(() => {
          const element = document.getElementById(`p${postNumber}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedPost(postNumber);
          }
        }, 100);
      }
    }
  }, [posts]);
  
  const handleQuoteClick = useCallback((postNumber: number) => {
    // Scroll to post
    const element = document.getElementById(`p${postNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedPost(postNumber);
    }
  }, []);
  
  const handleQuotePost = useCallback((postNumber: number) => {
    setQuoteText(`>>${postNumber}\n`);
    setShowForm(true);
    // Scroll to form
    setTimeout(() => {
      document.querySelector('.thread-reply-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);
  
  const handleCreateReply = async (data: {
    content: string;
    imageUrl?: string;
    imageName?: string;
    captchaToken?: string;
  }) => {
    await createPost.mutateAsync({
      threadId: threadId!,
      content: data.content,
      imageUrl: data.imageUrl,
      imageName: data.imageName,
      captchaToken: data.captchaToken,
    });
    setQuoteText('');
  };
  
  if (threadLoading) {
    return (
      <div className="min-h-screen bg-background">
        <BoardNav />
        <div className="text-center py-8 text-muted-foreground">Yüklənir...</div>
      </div>
    );
  }
  
  if (!thread) {
    return (
      <div className="min-h-screen bg-background">
        <BoardNav />
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-destructive">Mövzu tapılmadı</h1>
          <Link to={`/${slug}/`} className="text-primary mt-4 inline-block">
            Şöbəyə qayıt
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <BoardNav />
      
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Thread Header */}
        <header className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <Link to={`/${slug}/`} className="text-primary font-mono">
              &lt;&lt; /{slug}/ - {board?.name}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setShowForm(!showForm)}
              className="imageboard-button"
            >
              {showForm ? 'Formu Gizlət' : 'Cavab Yaz'}
            </button>
          </div>
        </header>
        
        {/* Original Post */}
        <div className="mb-4">
          <ThreadPost 
            thread={thread} 
            onQuoteClick={handleQuoteClick}
          />
          <div className="ml-4 mt-1">
            <button 
              onClick={() => handleQuotePost(thread.post_number)}
              className="text-xs text-link hover:text-link-hover font-mono"
            >
              [Cavab ver]
            </button>
          </div>
        </div>
        
        {/* Replies */}
        <section className="mb-4">
          {postsLoading ? (
            <div className="text-center py-4 text-muted-foreground">Cavablar yüklənir...</div>
          ) : posts?.length === 0 ? (
            <div className="post-container text-center py-4 ml-4">
              <p className="text-muted-foreground">Hələ cavab yoxdur. İlk cavabı siz yazın!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {posts?.map((post) => (
                <div key={post.id}>
                  <ReplyPost 
                    post={post} 
                    onQuoteClick={handleQuoteClick}
                    highlightedPost={highlightedPost}
                  />
                  <div className="ml-8 mt-1">
                    <button 
                      onClick={() => handleQuotePost(post.post_number)}
                      className="text-xs text-link hover:text-link-hover font-mono"
                    >
                      [Cavab ver]
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        {/* Reply Form */}
        {showForm && (
          <section className="mb-4">
            <h3 className="font-mono text-sm mb-2">Cavab yaz</h3>
            <PostForm 
              onSubmit={handleCreateReply} 
              initialQuote={quoteText}
            />
          </section>
        )}
        
        {/* Footer */}
        <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border">
          <Link to={`/${slug}/`}>Şöbəyə qayıt</Link>
          <span className="mx-2">|</span>
          <span>{(posts?.length || 0) + 1} post</span>
        </footer>
      </div>
    </div>
  );
};

export default ThreadPage;