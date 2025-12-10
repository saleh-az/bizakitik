import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import BoardPage from "./pages/BoardPage";
import ThreadPage from "./pages/ThreadPage";
import AdminPage from "./pages/AdminPage";
import SecurityDashboard from "./pages/SecurityDashboard";
import BannedPage from "./pages/BannedPage";
import NotFound from "./pages/NotFound";
import { useBanCheck } from "./hooks/useBanCheck";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isChecking } = useBanCheck();

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Yoxlanılır...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/:slug/" element={<BoardPage />} />
      <Route path="/:slug/thread/:threadId" element={<ThreadPage />} />
      <Route path="/secret-admin" element={<AdminPage />} />
      <Route path="/secret-admin/security" element={<SecurityDashboard />} />
      <Route path="/banned" element={<BannedPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;