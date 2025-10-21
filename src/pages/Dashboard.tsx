import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { WebsiteCard } from "@/components/dashboard/WebsiteCard";
import { AnalyticsCard } from "@/components/dashboard/AnalyticsCard";
import { FormSubmissionsCard } from "@/components/dashboard/FormSubmissionsCard";
import { ChangeRequestsCard } from "@/components/dashboard/ChangeRequestsCard";
import { QuickLinks } from "@/components/dashboard/QuickLinks";

// Mock data - will be replaced with real data from Supabase
const mockData = {
  user: {
    plan: "professional", // Change to "starter" or "premium" to test different views
    nextBilling: "November 18, 2025",
    amount: "$49.00",
  },
  site: {
    siteUrl: "yourplumbersite.com",
    siteName: "Joe's Plumbing",
    status: "live",
    launchedDate: "October 1, 2025",
    lastUpdated: "October 18, 2025, 2:30 PM",
  },
  analytics: {
    visitors: 2847,
    visitorsGrowth: 12,
    pageViews: 5421,
    topPages: [
      { name: "Homepage", views: 1204 },
      { name: "Services", views: 892 },
      { name: "Contact", views: 647 },
    ],
    trafficSources: {
      google: 45,
      direct: 32,
      social: 23,
    },
  },
  submissions: [
    {
      id: "sub-1",
      name: "John Doe",
      email: "john@example.com",
      message: "I need a quote for bathroom remodeling. Can you call me?",
      status: "new",
      submitted_at: "2025-10-18T10:30:00Z",
    },
    {
      id: "sub-2",
      name: "Jane Smith",
      email: "jane@example.com",
      message: "Love your work! Just wanted to leave a compliment.",
      status: "read",
      submitted_at: "2025-10-17T15:20:00Z",
    },
  ],
  changeRequests: [
    {
      id: "req-1",
      description: "Update phone number on contact page",
      status: "in_progress",
      created_at: "2025-10-18T09:00:00Z",
    },
    {
      id: "req-2",
      description: "Add new service photo to homepage",
      status: "completed",
      created_at: "2025-10-15T11:00:00Z",
      completed_at: "2025-10-15T14:30:00Z",
    },
  ],
};

const Dashboard = () => {
  const { user } = useAuth();
  const [userPlan, setUserPlan] = useState<string>("starter");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("users")
          .select("plan, stripe_customer_id")
          .eq("id", user.id)
          .single();
        
        if (error) {
          console.error("Error fetching user data:", error);
        } else if (data) {
          setUserPlan(data.plan);
          console.log("User plan:", data.plan, "Stripe customer:", data.stripe_customer_id);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const newSubmissionsCount = mockData.submissions.filter(s => s.status === "new").length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your website.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AccountCard
            plan={userPlan}
            nextBilling={mockData.user.nextBilling}
            amount={mockData.user.amount}
          />

          <WebsiteCard
            siteUrl={mockData.site.siteUrl}
            status={mockData.site.status}
            launchedDate={mockData.site.launchedDate}
            lastUpdated={mockData.site.lastUpdated}
          />

          <QuickLinks />

          <AnalyticsCard
            plan={userPlan}
            {...mockData.analytics}
          />

          <FormSubmissionsCard
            plan={userPlan}
            submissions={mockData.submissions}
            newCount={newSubmissionsCount}
          />

          <ChangeRequestsCard requests={mockData.changeRequests} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
