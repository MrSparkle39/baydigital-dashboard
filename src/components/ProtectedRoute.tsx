import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAccess, isBlocked, loading: subLoading } = useSubscriptionAccess();

  // Routes that don't require active subscription
  const exemptPaths = ['/onboarding', '/subscription-required'];
  const isExemptPath = exemptPaths.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }

    // Check subscription status after auth is loaded
    if (!authLoading && !subLoading && user && !isExemptPath) {
      if (isBlocked) {
        navigate("/subscription-required", { replace: true });
      }
    }
  }, [user, authLoading, subLoading, hasAccess, isBlocked, navigate, isExemptPath]);

  if (authLoading || subLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};
