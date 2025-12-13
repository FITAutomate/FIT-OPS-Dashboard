import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import { Layout } from "@/components/layout/Layout";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/companies" component={() => <div>Companies Page (Coming Soon)</div>} />
        <Route path="/deals" component={() => <div>Deals Page (Coming Soon)</div>} />
        <Route path="/calendar" component={() => <div>Calendar Page (Coming Soon)</div>} />
        <Route path="/reports" component={() => <div>Reports Page (Coming Soon)</div>} />
        <Route path="/settings" component={() => <div>Settings Page (Coming Soon)</div>} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
