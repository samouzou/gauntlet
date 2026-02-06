"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  UserX,
  CircleDollarSign,
  GitMerge,
  BarChart,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, tooltip: "Dashboard" },
  { href: "/forecasting", label: "Forecasting", icon: TrendingUp, tooltip: "Forecasting" },
  { href: "/expenses", label: "Expenses", icon: Wallet, tooltip: "Expenses" },
  { href: "/churn", label: "Churn", icon: UserX, tooltip: "Churn" },
  { href: "/cash-flow", label: "Cash Flow", icon: CircleDollarSign, tooltip: "Cash Flow" },
  { href: "/scenarios", label: "Scenarios", icon: GitMerge, tooltip: "Scenarios" },
  { href: "/reports", label: "Reports", icon: BarChart, tooltip: "Reports" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2">
          <Logo className="w-8 h-8 text-primary" />
          <span className="font-semibold text-lg text-sidebar-foreground">SaaSight</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton 
                  isActive={pathname === item.href}
                  tooltip={{children: item.tooltip, side: "right"}}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
