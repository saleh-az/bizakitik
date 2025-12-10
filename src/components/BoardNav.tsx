import { Link } from 'react-router-dom';
import { useBoards } from '@/hooks/useBoards';

export function BoardNav() {
  const { data: boards, isLoading } = useBoards();
  
  if (isLoading) {
    return (
      <nav className="board-nav">
        <span className="text-muted-foreground">Yüklənir...</span>
      </nav>
    );
  }
  
  return (
    <nav className="board-nav">
      <span className="text-muted-foreground">[</span>
      {boards?.map((board, index) => (
        <span key={board.id}>
          <Link to={`/${board.slug}/`} className="board-link">
            /{board.slug}/
          </Link>
          {index < (boards?.length || 0) - 1 && <span className="text-muted-foreground">/</span>}
        </span>
      ))}
      <span className="text-muted-foreground">]</span>
      <span className="mx-2 text-muted-foreground">|</span>
      <Link to="/" className="board-link">Ana Səhifə</Link>
    </nav>
  );
}