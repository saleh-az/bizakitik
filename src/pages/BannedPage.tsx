import { Link } from "react-router-dom";
import { BoardNav } from "@/components/BoardNav";

const BannedPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <BoardNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="post-container text-center py-12">
          <h1 className="text-4xl font-bold text-destructive font-mono mb-4">IP BAN EDİLDİ</h1>
          <p className="text-xl text-foreground mb-2">Sizin IP ünvanınız ban edilib</p>
          <p className="text-muted-foreground mb-6">
            Çox sayda sorğu və ya şübhəli davranış səbəbindən IP ünvanınız ban edilib.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Əgər bu səhv olduğunu düşünürsünüzsə, lütfən administratorla əlaqə saxlayın.
          </p>
          <Link to="/" className="imageboard-button-primary inline-block">
            Ana Səhifəyə Qayıt
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BannedPage;


