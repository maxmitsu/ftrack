import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Dashboard from "./pages/dashboard";
import Transactions from "./pages/transactions";
import Budgets from "./pages/budgets";
import Accounts from "./pages/accounts";
import Goals from "./pages/goals";
import Recurring from "./pages/recurring";
import Report from "./pages/report";
import Settings from "./pages/settings";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter hook={useHashLocation}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
