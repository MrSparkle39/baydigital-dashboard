import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, FileText, TrendingUp, Bell, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatNotificationTime } from "@/lib/notifications";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  totalUsers: number;
  newUsersThisWeek: number;
  openTickets: number;
  recentTickets: number;
  totalSubmissions: number;
}

interface RecentActivity {
  id: string;
  type: "user" | "ticket" | "submission";
  title: string;
  description: string;
  timestamp: string;
  icon: any;
  link: string;
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount } = useNotifications(user?.id);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsersThisWeek: 0,
    openTickets: 0,
    recentTickets: 0,
    totalSubmissions: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    // Get date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch all stats in parallel
    const [usersResult, newUsersResult, ticketsResult, recentTicketsResult, submissionsResult] = 
      await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase.from("update_tickets").select("*", { count: "exact", head: true })
          .eq("status", "open"),
        supabase.from("update_tickets").select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase.from("form_submissions").select("*", { count: "exact", head: true }),
      ]);

    setStats({
      totalUsers: usersResult.count || 0,
      newUsersThisWeek: newUsersResult.count || 0,
      openTickets: ticketsResult.count || 0,
      recentTickets: recentTicketsResult.count || 0,
      totalSubmissions: submissionsResult.count || 0,
    });

    // Fetch recent activity
    await fetchRecentActivity();

    setLoading(false);
  };

  const fetchRecentActivity = async () => {
    const activities: RecentActivity[] = [];

    // Get recent users
    const { data: recentUsers } = await supabase
      .from("users")
      .select("id, email, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentUsers) {
      recentUsers.forEach((user) => {
        activities.push({
          id: user.id,
          type: "user",
          title: "New User Signup",
          description: user.email,
          timestamp: user.created_at,
          icon: Users,
          link: `/admin/users/${user.id}`,
        });
      });
    }

    // Get recent tickets
    const { data: recentTickets } = await supabase
      .from("update_tickets")
      .select("id, subject, status, created_at, users(email)")
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentTickets) {
      recentTickets.forEach((ticket: any) => {
        activities.push({
          id: ticket.id,
          type: "ticket",
          title: ticket.subject,
          description: `Status: ${ticket.status} • ${ticket.users?.email}`,
          timestamp: ticket.created_at,
          icon: FileText,
          link: `/admin/tickets`,
        });
      });
    }

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setRecentActivity(activities.slice(0, 10));
  };

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend, 
    onClick 
  }: { 
    title: string; 
    value: number; 
    description: string; 
    icon: any; 
    trend?: string;
    onClick?: () => void;
  }) => (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <Badge variant="secondary" className="mt-2">
            {trend}
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          description={`${stats.newUsersThisWeek} new this week`}
          icon={Users}
          trend={stats.newUsersThisWeek > 0 ? `+${stats.newUsersThisWeek} this week` : undefined}
          onClick={() => navigate("/admin/users")}
        />
        <StatCard
          title="Open Tickets"
          value={stats.openTickets}
          description={`${stats.recentTickets} created this week`}
          icon={FileText}
          onClick={() => navigate("/admin/tickets")}
        />
        <StatCard
          title="Form Submissions"
          value={stats.totalSubmissions}
          description="Total leads captured"
          icon={TrendingUp}
        />
        <StatCard
          title="Notifications"
          value={unreadCount}
          description="Unread notifications"
          icon={Bell}
          onClick={() => navigate("/admin/notifications")}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across your platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-4 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => navigate(activity.link)}
                    >
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-sm font-medium leading-none">{activity.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatNotificationTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>Your latest alerts and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start space-x-4 p-3 rounded-lg cursor-pointer transition-colors ${
                      !notification.read ? "bg-accent/50" : "hover:bg-accent/30"
                    }`}
                    onClick={() => {
                      // Deep-link ticket-related notifications to Admin Tickets page
                      if (["ticket_reply","ticket_message","new_ticket","ticket_status"].includes((notification as any).type)) {
                        const id = typeof (notification as any).link === 'string' ? (notification as any).link : undefined;
                        navigate(id ? `/admin/tickets?ticket=${id}` : '/admin/tickets');
                        return;
                      }

                      if ((notification as any).link) {
                        if (typeof (notification as any).link === 'string' && (notification as any).link.startsWith('/')) {
                          navigate((notification as any).link);
                        } else {
                          // If link is an ID or invalid path, default to tickets
                          navigate('/admin/tickets');
                        }
                      }
                    }}
                  >
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium leading-none ${!notification.read ? "font-semibold" : ""}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/admin/notifications")}
                >
                  View All Notifications
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate("/admin/users")}
            >
              <Users className="h-5 w-5" />
              <span>View Users</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate("/admin/tickets")}
            >
              <FileText className="h-5 w-5" />
              <span>Manage Tickets</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate("/admin/analytics")}
            >
              <TrendingUp className="h-5 w-5" />
              <span>View Analytics</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => navigate("/admin/notifications")}
            >
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
