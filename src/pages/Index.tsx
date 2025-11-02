import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (!loading && user) {
        // Check if onboarding is complete
        const { data: userData } = await supabase
          .from('users')
          .select('onboarding_complete')
          .eq('id', user.id)
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
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
};

export default Index;
