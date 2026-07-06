"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

type AppSidebarProps = {
  user: {
    name: string;
    email: string;
    role: string;
  };
};

const adminHrItems = [
  { label: "Dashboard", href: "/" },
  { label: "Cargos", href: "/positions" },
  { label: "Manuales", href: "/manuals" },
  { label: "Base de Conocimientos", href: "/knowledge-base" },
  { label: "Evaluaciones", href: "/evaluations" },
  { label: "Mis Evaluaciones", href: "/my-evaluations" },
];

const employeeItems = [
  { label: "Dashboard", href: "/" },
  { label: "Mis Evaluaciones", href: "/my-evaluations" },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const isAdminOrHr = user.role === "ADMIN" || user.role === "HR";
  const navItems = isAdminOrHr ? adminHrItems : employeeItems;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
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
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={(props) => <a href={item.href} {...props} />}
                  >
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
