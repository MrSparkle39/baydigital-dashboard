import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        // If admin, redirect to admin dashboard
        if (roleData) {
          navigate("/admin", { replace: true });
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        } else if (data) {
          setUserData(data);
          console.log("User data loaded:", data);
          
          // Fetch analytics if user has GA4 configured and is on pro/premium plan
          if (data?.ga4_property_id && (data?.plan === 'professional' || data?.plan === 'premium')) {
            fetchAnalytics(data.ga4_property_id);
          }
          
          // Fetch form submissions for professional and premium users
          if (data?.plan === 'professional' || data?.plan === 'premium') {
            fetchSubmissions();
          }
        }
      } else {
        // Clear user data when user logs out
        setUserData(null);
      }
      setLoading(false);
    };

    fetchUserData();
  }, [user, navigate]);

  const fetchAnalytics = async (propertyId: string) => {
    setAnalyticsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-ga4-analytics', {
        body: { 
          propertyId,
          startDate: '28daysAgo',
          endDate: 'today'
        }
      });

      if (error) {
        console.error('Error fetching analytics:', error);
      } else {
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      // Get user's sites first
      const { data: sites } = await supabase
        .from('sites')
        .select('id')
        .eq('user_id', user?.id);

      if (!sites || sites.length === 0) {
        setSubmissions([]);
        setSubmissionsLoading(false);
        return;
      }

      const siteIds = sites.map(s => s.id);

      // Fetch submissions for user's sites
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .in('site_id', siteIds)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching submissions:', error);
      } else {
        setSubmissions(data || []);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const newSubmissionsCount = submissions.filter(s => s.status === "new").length;
  const userPlan = userData?.plan || "starter";
  const businessName = userData?.business_name || userData?.full_name || "there";

  // Calculate billing info based on actual plan and subscription data
  const getPlanAmount = (plan: string) => {
    switch(plan) {
      case 'starter': return '$29.00';
      case 'professional': return '$49.00';
      case 'premium': return '$99.00';
      default: return '$29.00';
    }
  };

  const getNextBillingDate = () => {
    if (userData?.subscription_end_date) {
      return new Date(userData.subscription_end_date).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    return 'Pending subscription activation';
  };

  const billingAmount = getPlanAmount(userPlan);
  const nextBillingDate = getNextBillingDate();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {businessName}! Here's what's happening with your website.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AccountCard
            plan={userPlan}
            nextBilling={nextBillingDate}
            amount={billingAmount}
            subscriptionStatus={userData?.subscription_status}
          />

          <WebsiteCard
            siteUrl={userData?.website_url || userData?.domain || "yoursite.com"}
            status={userData?.website_status || "pending"}
            launchedDate={userData?.subscription_start_date ? new Date(userData.subscription_start_date).toLocaleDateString('en-AU') : "Pending"}
            lastUpdated={userData?.updated_at ? new Date(userData.updated_at).toLocaleString('en-AU') : "N/A"}
          />

          <div className="order-last md:order-none">
            <QuickLinks />
          </div>

          <AnalyticsCard
            plan={userPlan}
            ga4PropertyId={userData?.ga4_property_id}
            visitors={analyticsData?.visitors}
            pageViews={analyticsData?.pageViews}
            sessions={analyticsData?.sessions}
            engagementRate={analyticsData?.engagementRate}
            avgSessionDuration={analyticsData?.avgSessionDuration}
            topPages={analyticsData?.topPages}
            trafficSources={analyticsData?.trafficSources}
            devices={analyticsData?.devices}
            topCountries={analyticsData?.topCountries}
            dateRange={analyticsData?.dateRange}
            loading={analyticsLoading}
          />

          <FormSubmissionsCard
            plan={userPlan}
            submissions={submissions}
            newCount={newSubmissionsCount}
          />

          <ChangeRequestsCard />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
