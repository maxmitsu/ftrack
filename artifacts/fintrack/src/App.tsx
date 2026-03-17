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
      <Route path="/transacciones" component={Transactions} />
      <Route path="/presupuesto" component={Budgets} />
      <Route path="/cuentas" component={Accounts} />
      <Route path="/metas" component={Goals} />
      <Route path="/pagos" component={Recurring} />
      <Route path="/reporte" component={Report} />
      <Route path="/configuracion" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const status = getGoogleDriveStatus();
    setLoggedIn(!!status.connected);
    setChecked(true);
  }, []);

  if (!checked) return null;

  return (
    <WouterRouter hook={useHashLocation}>
      {loggedIn ? (
        <AppRoutes />
      ) : (
        <Login onLoginSuccess={() => setLoggedIn(true)} />
      )}
    </WouterRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
