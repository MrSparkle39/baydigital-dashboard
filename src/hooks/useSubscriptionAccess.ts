import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'pending' | null;

export const useSubscriptionAccess = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setStatus(data.subscription_status as SubscriptionStatus);
      }
      setLoading(false);
    };

    checkSubscription();
  }, [user]);

  const hasAccess = status === 'active' || status === 'trialing' || status === 'past_due';
  const isGracePeriod = status === 'past_due';
  const isBlocked = status === 'cancelled' || status === 'pending';

  return {
    status,
    loading,
    hasAccess,
    isGracePeriod,
    isBlocked,
  };
};
