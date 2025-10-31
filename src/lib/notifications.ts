import { supabase } from "@/integrations/supabase/client";
import { 
  Bell, 
  FileText, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  MessageSquare 
} from "lucide-react";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type NotificationType = 
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_message'
  | 'user_signup'
  | 'status_change'
  | 'analytics_ready'
  | 'site_update'
  | 'new_ticket'
  | 'ticket_reply';

/**
 * Create a new notification
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message?: string,
  link?: string
): Promise<{ data: Notification | null; error: any }> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      title,
      message,
      link,
      read: false,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  return { error };
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  return { error };
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Get notifications for a user with pagination
 */
export async function getNotifications(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ data: Notification[]; error: any }> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { data: data || [], error };
}

/**
 * Get recent notifications (last 10)
 */
export async function getRecentNotifications(
  userId: string
): Promise<{ data: Notification[]; error: any }> {
  return getNotifications(userId, 10, 0);
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  return { error };
}

/**
 * Get icon for notification type
 */
export function getNotificationIcon(type: string) {
  const iconMap: Record<string, any> = {
    ticket_created: FileText,
    ticket_updated: FileText,
    ticket_message: MessageSquare,
    new_ticket: FileText,
    ticket_reply: MessageSquare,
    user_signup: Users,
    new_user: Users,
    status_change: AlertCircle,
    analytics_ready: TrendingUp,
    site_update: CheckCircle2,
  };

  return iconMap[type] || Bell;
}

/**
 * Format notification timestamp
 */
export function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return date.toLocaleDateString();
}
