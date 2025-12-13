import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Briefcase, Calendar, Settings, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@assets/generated_images/minimalist_geometric_logo_for_fit_crm_in_blue_and_green.png";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Users, label: "Companies", href: "/companies" },
  { icon: Briefcase, label: "Deals", href: "/deals" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: PieChart, label: "Reports", href: "/reports" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

/**
 * Sidebar Component
 * 
 * Displays the main navigation menu and user profile summary.
 * Uses a fixed position layout with a custom gradient background.
 */
export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-linear-to-b from-sidebar to-[#000040] text-sidebar-foreground flex flex-col shadow-xl z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
          <img src={logo} alt="FIT CRM" className="w-8 h-8 object-contain" />
        </div>
        <span className="font-heading font-bold text-xl tracking-tight text-white">FIT CRM</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 cursor-pointer group",
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/30 translate-x-1"
                    : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white hover:translate-x-1"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-sidebar-foreground/70 group-hover:text-white")} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
            JD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">John Doe</span>
            <span className="text-xs text-sidebar-foreground/60">Administrator</span>
          </div>
        </div>
      </div>
    </div>
  );
}
