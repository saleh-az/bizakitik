import { Link } from "react-router-dom";
import { BoardNav } from "@/components/BoardNav";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background">
      <BoardNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="post-container text-center py-12">
          <h1 className="text-6xl font-bold text-primary font-mono mb-4">404</h1>
          <p className="text-xl text-foreground mb-2">Səhifə tapılmadı</p>
          <p className="text-muted-foreground mb-6">
            Axtardığınız səhifə mövcud deyil və ya silinib.
          </p>
          <Link to="/" className="imageboard-button-primary inline-block">
            Ana Səhifəyə Qayıt
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;