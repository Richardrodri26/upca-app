"use client";

import {
  BarChart2,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileText,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type AppSidebarProps = {
  user: {
    name: string;
    email: string;
    role: string;
  };
};

const adminHrItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Cargos", href: "/positions", icon: Briefcase },
  { label: "Manuales", href: "/manuals", icon: FileText },
  { label: "Base de Conocimientos", href: "/knowledge-base", icon: Database },
  { label: "Evaluaciones", href: "/evaluations", icon: ClipboardList },
  { label: "Mis Evaluaciones", href: "/my-evaluations", icon: ClipboardCheck },
  { label: "Mis Resultados", href: "/my-results", icon: BarChart2 },
];

const adminOnlyItems = [{ label: "Usuarios", href: "/users", icon: Users }];

const employeeItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Mis Evaluaciones", href: "/my-evaluations", icon: ClipboardCheck },
  { label: "Mis Resultados", href: "/my-results", icon: BarChart2 },
];

const areaLeadItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Evaluaciones", href: "/evaluations", icon: ClipboardList },
  { label: "Mis Resultados", href: "/my-results", icon: BarChart2 },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const isAdminOrHr = user.role === "ADMIN" || user.role === "HR";
  const isAdmin = user.role === "ADMIN";
  const isAreaLead = user.role === "AREA_LEAD";
  const baseItems = isAdminOrHr
    ? adminHrItems
    : isAreaLead
      ? areaLeadItems
      : employeeItems;
  const navItems = isAdmin ? [...baseItems, ...adminOnlyItems] : baseItems;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-black tracking-tighter text-primary-foreground">
            U
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">UPCA</span>
            <span className="text-xs text-muted-foreground">Evaluaciones</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    render={(props) => <a href={item.href} {...props} />}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-2 px-2 py-3">
          <div className="flex flex-col">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
          <SignOutButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
