import { Home, Users, FileText, TrendingUp, Settings, Bell } from "lucide-react";
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
  { title: "Overview", url: "/admin", icon: Home },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Tickets", url: "/admin/tickets", icon: FileText },
  { title: "Analytics", url: "/admin/analytics", icon: TrendingUp },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [newUsersCount, setNewUsersCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    fetchCounts();
    
    // Subscribe to realtime updates for tickets
    const ticketsChannel = supabase
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

    // Subscribe to realtime updates for users
    const usersChannel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users'
        },
        () => {
          fetchNewUsers();
        }
      )
      .subscribe();

    // Subscribe to realtime updates for notifications
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, []);

  const fetchCounts = () => {
    fetchOpenTickets();
    fetchNewUsers();
    fetchUnreadNotifications();
  };

  const fetchOpenTickets = async () => {
    const { count } = await supabase
      .from("update_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");
    
    setOpenTicketsCount(count || 0);
  };

  const fetchNewUsers = async () => {
    // Get users created in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());
    
    setNewUsersCount(count || 0);
  };

  const fetchUnreadNotifications = async () => {
    // Get current admin user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      
      setUnreadNotifications(count || 0);
    }
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
                      end={item.url === "/admin"}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      
                      {/* Show badge for open tickets */}
                      {item.title === "Tickets" && openTicketsCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto"
                        >
                          {openTicketsCount}
                        </Badge>
                      )}
                      
                      {/* Show badge for new users */}
                      {item.title === "Users" && newUsersCount > 0 && (
                        <Badge 
                          variant="default" 
                          className="ml-auto bg-blue-500"
                        >
                          {newUsersCount}
                        </Badge>
                      )}
                      
                      {/* Show badge for unread notifications */}
                      {item.title === "Notifications" && unreadNotifications > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto"
                        >
                          {unreadNotifications}
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
