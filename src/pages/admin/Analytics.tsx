import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Users as UsersIcon } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type User = Database["public"]["Tables"]["users"]["Row"];

export default function AdminAnalytics() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .in("plan", ["professional", "premium"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const usersWithGA4 = users.filter((u) => u.ga4_property_id);
  const usersWithoutGA4 = users.filter((u) => !u.ga4_property_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Analytics Overview</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Professional+ Users
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GA4 Configured</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersWithGA4.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.length > 0
                ? `${Math.round((usersWithGA4.length / users.length) * 100)}% of users`
                : "No users yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Setup</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersWithoutGA4.length}</div>
            <p className="text-xs text-muted-foreground">
              Users waiting for GA4 configuration
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Users with Analytics Enabled</h3>
        {usersWithGA4.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No users have GA4 configured yet
            </CardContent>
          </Card>
        ) : (
          usersWithGA4.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {user.business_name || user.full_name || user.email}
                  </CardTitle>
                  <Badge>{user.plan}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      GA4 Property ID: {user.ga4_property_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Website: {user.website_url || "Not set"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {usersWithoutGA4.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Pending GA4 Setup</h3>
          {usersWithoutGA4.map((user) => (
            <Card
              key={user.id}
              className="hover:shadow-md transition-shadow border-warning"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {user.business_name || user.full_name || user.email}
                  </CardTitle>
                  <Badge variant="outline">{user.plan}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      ⚠️ GA4 Property ID not configured
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Website Status: {user.website_status || "pending"}
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                  >
                    Configure GA4
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
