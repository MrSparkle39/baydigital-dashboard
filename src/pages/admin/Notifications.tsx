import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, Trash2, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { getNotificationIcon, formatNotificationTime, Notification } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";

export default function AdminNotifications() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refetch } = useNotifications(user?.id);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    filterNotifications();
  }, [notifications, filter]);

  const filterNotifications = () => {
    let filtered = notifications;

    if (filter === "unread") {
      filtered = notifications.filter((n) => !n.read);
    } else if (filter === "read") {
      filtered = notifications.filter((n) => n.read);
    }

    setFilteredNotifications(filtered);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Ticket-related: deep link to admin tickets with query param
    if (['ticket_reply','ticket_message','new_ticket','ticket_status'].includes(notification.type)) {
      const id = typeof notification.link === 'string' ? notification.link : undefined;
      navigate(id ? `/admin/tickets?ticket=${id}` : '/admin/tickets');
      return;
    }

    if (notification.link) {
      if (typeof notification.link === 'string' && notification.link.startsWith('/')) {
        navigate(notification.link);
      } else {
        // If link is an ID or invalid path, default to tickets
        navigate('/admin/tickets');
      }
    }
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (!error) {
      refetch();
    }
  };

  const handleDeleteAllRead = async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("read", true);

    if (!error) {
      refetch();
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ticket_created: "New Ticket",
      ticket_updated: "Ticket Updated",
      ticket_message: "New Message",
      user_signup: "New User",
      status_change: "Status Change",
      analytics_ready: "Analytics",
      site_update: "Site Update",
    };
    return labels[type] || type;
  };

  const getNotificationTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ticket_created: "bg-blue-100 text-blue-800",
      ticket_updated: "bg-yellow-100 text-yellow-800",
      ticket_message: "bg-purple-100 text-purple-800",
      user_signup: "bg-green-100 text-green-800",
      status_change: "bg-orange-100 text-orange-800",
      analytics_ready: "bg-indigo-100 text-indigo-800",
      site_update: "bg-pink-100 text-pink-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and stay updated
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
          {notifications.some((n) => n.read) && (
            <Button variant="outline" onClick={handleDeleteAllRead}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete read
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Read</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length - unreadCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read">
            Read ({notifications.length - unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {filter === "all" && "All Notifications"}
                {filter === "unread" && "Unread Notifications"}
                {filter === "read" && "Read Notifications"}
              </CardTitle>
              <CardDescription>
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No notifications</p>
                    <p className="text-sm">
                      {filter === "unread" && "You're all caught up!"}
                      {filter === "read" && "No read notifications yet"}
                      {filter === "all" && "You don't have any notifications yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`group relative flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
                          !notification.read
                            ? "bg-accent/50 hover:bg-accent/70 border-accent"
                            : "hover:bg-accent/30 border-border"
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0 text-2xl">
                          {getNotificationIcon(notification.type as any)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-medium ${!notification.read ? "font-semibold" : ""}`}>
                                {notification.title}
                              </p>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getNotificationTypeColor(notification.type)}`}
                              >
                                {getNotificationTypeLabel(notification.type)}
                              </Badge>
                            </div>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                            )}
                          </div>

                          {notification.message && (
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {formatNotificationTime(notification.created_at)}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2"
                              onClick={(e) => handleDeleteNotification(notification.id, e)}
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
