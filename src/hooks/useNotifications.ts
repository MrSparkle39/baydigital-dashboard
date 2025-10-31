import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Notification, 
  getUnreadCount, 
  getRecentNotifications,
  markAsRead as markNotificationAsRead,
  markAllAsRead as markAllNotificationsAsRead
} from "@/lib/notifications";

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchNotifications();
    fetchUnreadCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Notification change:", payload);
          
          if (payload.eventType === "INSERT") {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === "UPDATE") {
            const updatedNotification = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
            );
            fetchUnreadCount();
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) return;
    
    setLoading(true);
    const { data, error } = await getRecentNotifications(userId);
    
    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(data);
    }
    
    setLoading(false);
  };

  const fetchUnreadCount = async () => {
    if (!userId) return;
    
    const count = await getUnreadCount(userId);
    setUnreadCount(count);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await markNotificationAsRead(notificationId);
    
    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    const { error } = await markAllNotificationsAsRead(userId);
    
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const refetch = () => {
    fetchNotifications();
    fetchUnreadCount();
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}
