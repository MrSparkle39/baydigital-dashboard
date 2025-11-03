import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SubscriptionRequired = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserData(data);
      setLoading(false);
    };

    fetchUserData();
  }, [user]);

  const handleSyncStatus = async () => {
    try {
      setSyncing(true);
      const { data, error } = await supabase.functions.invoke('sync-subscription');

      if (error) throw error;

      // Refresh user data
      const { data: updatedData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      setUserData(updatedData);

      // If status is now active, redirect to dashboard
      if (updatedData?.subscription_status === 'active' || updatedData?.subscription_status === 'trialing') {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error syncing subscription:', error);
      alert("Failed to sync subscription status. Please try again or contact support.");
    } finally {
      setSyncing(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { returnUrl: window.location.origin + '/subscription-required' }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert("Failed to open billing portal. Please contact support@bay.digital");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const isCancelled = userData?.subscription_status === 'cancelled';
  const isPending = userData?.subscription_status === 'pending';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">
            {isCancelled ? 'Subscription Cancelled' : 'Payment Required'}
          </CardTitle>
          <CardDescription>
            {isCancelled 
              ? 'Your subscription has been cancelled and your account is no longer active.'
              : 'Your payment is pending or there was an issue with your last payment.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-sm">
              {isCancelled ? (
                <>
                  To regain access to your dashboard and website, please reactivate your subscription.
                </>
              ) : (
                <>
                  Please update your payment method to continue using Bay Digital services.
                </>
              )}
            </AlertDescription>
          </Alert>

          {userData && (
            <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium capitalize">{userData.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize text-destructive">
                  {userData.subscription_status}
                </span>
              </div>
              {userData.subscription_end_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ended:</span>
                  <span className="font-medium">
                    {new Date(userData.subscription_end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Button 
              onClick={handleSyncStatus}
              className="w-full"
              size="lg"
              variant="secondary"
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Refresh Payment Status'}
            </Button>

            <Button 
              onClick={handleManageBilling} 
              className="w-full"
              size="lg"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {isCancelled ? 'Reactivate Subscription' : 'Update Payment Method'}
            </Button>
            
            <Button 
              onClick={() => signOut()} 
              variant="outline" 
              className="w-full"
            >
              Sign Out
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Need help? Contact us at{" "}
            <a href="mailto:support@bay.digital" className="text-primary hover:underline">
              support@bay.digital
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionRequired;
