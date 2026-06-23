import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Home from "@/pages/marketing/Home";

/**
 * The dashboard app and the marketing site are served from the same build but
 * on different hostnames:
 *   - dashboard.bay.digital  -> the app (redirect "/" to login/dashboard)
 *   - bay.digital (and local dev) -> the marketing homepage
 */
const isDashboardHost = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.location.hostname.startsWith("dashboard.");
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const dashboardHost = isDashboardHost();

  useEffect(() => {
    if (!dashboardHost) return;

    const checkUserAndRedirect = async () => {
      if (!loading && user) {
        const { data: userData } = await supabase
          .from("users")
          .select("onboarding_complete")
          .eq("id", user.id)
          .single();

        if (userData && !userData.onboarding_complete) {
          navigate("/onboarding");
        } else {
          navigate("/dashboard");
        }
      } else if (!loading) {
        navigate("/login");
      }
    };

    checkUserAndRedirect();
  }, [user, loading, navigate, dashboardHost]);

  // Marketing homepage for the public site (and local dev).
  if (!dashboardHost) {
    return <Home />;
  }

  // App host: show a loader while we decide where to send the user.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
};

export default Index;
