import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { useEffect } from "react";

const queryClient = new QueryClient();

const MapRedirect = () => {
  useEffect(() => {
    window.location.href = '/Map/index.html';
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Redirecting to map...</p>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/map" element={<MapRedirect />} />
            <Route
              path="/crossings"
              element={
                <PlaceholderPage
                  title="Railway Crossings"
                  description="Manage and monitor all railway crossings"
                />
              }
            />
            <Route
              path="/alerts"
              element={
                <PlaceholderPage
                  title="Active Alerts"
                  description="View and manage system alerts and notifications"
                />
              }
            />
            <Route
              path="/reroutes"
              element={
                <PlaceholderPage
                  title="Reroutes"
                  description="Traffic rerouting management and monitoring"
                />
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
