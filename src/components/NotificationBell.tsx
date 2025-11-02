import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { getNotificationIcon, formatNotificationTime } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdminStatus();
  }, [user]);

  const handleNotificationClick = (notification: any) => {
    // Mark as read asynchronously (don't wait)
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Determine if we're in admin context
    const inAdminArea = location.pathname.startsWith('/admin');

    // Handle navigation based on notification type and link
    if (['ticket_reply','ticket_message','new_ticket','ticket_status'].includes(notification.type)) {
      const id = typeof notification.link === 'string' ? notification.link : undefined;
      if (inAdminArea || isAdmin) {
        navigate(id ? `/admin/tickets?ticket=${id}` : '/admin/tickets');
      } else {
        navigate(id ? `/dashboard?ticket=${id}` : '/dashboard');
      }
    } else if (notification.link) {
      if (typeof notification.link === 'string' && notification.link.startsWith('/')) {
        navigate(notification.link);
      } else {
        navigate(inAdminArea ? '/admin' : '/dashboard');
      }
    } else {
      // Default fallback based on context
      navigate(inAdminArea ? '/admin' : '/dashboard');
    }
  };

  const handleViewAll = () => {
    navigate("/notifications");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.slice(0, 5).map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="mt-1">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center text-sm text-primary cursor-pointer"
          onClick={handleViewAll}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
