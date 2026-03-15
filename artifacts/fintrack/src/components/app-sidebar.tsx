import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ArrowUpDown, 
  PieChart, 
  Landmark, 
  Target, 
  CalendarDays, 
  BarChart3, 
  Settings,
  Wallet
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Transacciones", url: "/transacciones", icon: ArrowUpDown },
  { title: "Presupuesto", url: "/presupuesto", icon: PieChart },
  { title: "Cuentas", url: "/cuentas", icon: Landmark },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Pagos fijos", url: "/pagos", icon: CalendarDays },
  { title: "Reporte", url: "/reporte", icon: BarChart3 },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/95 backdrop-blur-xl">
      <SidebarHeader className="p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground leading-none tracking-tight">FinTrack</h2>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Mis Finanzas</p>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link 
                        href={item.url} 
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location === "/configuracion"}>
              <Link 
                href="/configuracion" 
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
                  location === "/configuracion" 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Settings className="h-5 w-5" />
                <span className="text-sm">Configuración</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
