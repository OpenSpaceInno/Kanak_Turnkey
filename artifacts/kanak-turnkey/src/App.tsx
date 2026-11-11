import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads/index";
import LeadDetail from "@/pages/leads/[id]";
import Projects from "@/pages/projects/index";
import ProjectDetail from "@/pages/projects/[id]";
import Tasks from "@/pages/tasks/index";
import Finance from "@/pages/finance/index";
import ClientARPage from "@/pages/finance/client-ar";
import VendorAPPage from "@/pages/finance/vendor-ap";
import Procurement from "@/pages/procurement/index";
import ProcurementOrdersPage from "@/pages/procurement/orders";
import ProcurementStockPage from "@/pages/procurement/stock";
import Communications from "@/pages/communications/index";
import Meetings from "@/pages/meetings/index";
import Documents from "@/pages/documents/index";
import Notifications from "@/pages/notifications/index";
import AuditLogs from "@/pages/audit-logs/index";
import Admin from "@/pages/admin/index";
import Settings from "@/pages/settings/index";
import TaskTemplates from "@/pages/task-templates/index";
import LoginPage from "@/pages/login";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            
            <Route path="/leads" component={Leads} />
            <Route path="/leads/:id" component={LeadDetail} />
            
            <Route path="/projects" component={Projects} />
            <Route path="/projects/:id" component={ProjectDetail} />
            
            <Route path="/tasks" component={Tasks} />
            <Route path="/task-templates" component={TaskTemplates} />
            <Route path="/finance/ar" component={ClientARPage} />
            <Route path="/finance/ap" component={VendorAPPage} />
            <Route path="/finance" component={Finance} />
            <Route path="/procurement/orders" component={ProcurementOrdersPage} />
            <Route path="/procurement/stock" component={ProcurementStockPage} />
            <Route path="/procurement" component={Procurement} />
            <Route path="/communications" component={Communications} />
            <Route path="/meetings" component={Meetings} />
            <Route path="/documents" component={Documents} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/audit-logs" component={AuditLogs} />
            <Route path="/admin" component={Admin} />
            <Route path="/settings" component={Settings} />
            
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
