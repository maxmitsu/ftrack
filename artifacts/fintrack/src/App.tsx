import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getGoogleDriveStatus } from "@workspace/api-client-react";

import Dashboard from "./pages/dashboard";
import Transactions from "./pages/transactions";
import Budgets from "./pages/budgets";
import Accounts from "./pages/accounts";
import Goals from "./pages/goals";
import Recurring from "./pages/recurring";
import Report from "./pages/report";
import Settings from "./pages/settings";
import NotFound from "./pages/not-found";
import Login from "./pages/login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/budgets" component={Budgets} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/goals" component={Goals} />
      <Route path="/recurring" component={Recurring} />
      <Route path="/report" component={Report} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const status = getGoogleDriveStatus();
    setLoggedIn(!!status.connected);
  }, []);

  if (!loggedIn) {
    return <Login onLoginSuccess={() => setLoggedIn(true)} />;
  }

  return (
    <WouterRouter hook={useHashLocation}>
      <AppRoutes />
    </WouterRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
