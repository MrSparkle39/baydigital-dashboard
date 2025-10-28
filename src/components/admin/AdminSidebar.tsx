import { Users, FileText, TrendingUp, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Tickets", url: "/admin/tickets", icon: FileText },
  { title: "Analytics", url: "/admin/analytics", icon: TrendingUp },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [openTicketsCount, setOpenTicketsCount] = useState(0);

  useEffect(() => {
    fetchOpenTickets();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'update_tickets'
        },
        () => {
          fetchOpenTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOpenTickets = async () => {
    const { count } = await supabase
      .from("update_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");
    
    setOpenTicketsCount(count || 0);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {item.title === "Tickets" && openTicketsCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto"
                        >
                          {openTicketsCount}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
