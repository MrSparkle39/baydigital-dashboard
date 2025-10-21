import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      navigate('/login');
      return;
    }

    // Verify the session with Stripe
    const verifySession = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-checkout', {
          body: { session_id: sessionId }
        });

        if (error) throw error;

        setEmail(data?.email || null);
      } catch (err) {
        console.error('Verification error:', err);
      } finally {
        setVerifying(false);
      }
    };

    verifySession();
  }, [searchParams, navigate]);

  const handleContinue = () => {
    navigate(email ? `/login?email=${encodeURIComponent(email)}` : '/login');
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Verifying payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-4 text-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h1 className="text-3xl font-bold text-green-600">Payment Successful!</h1>
          <div className="space-y-2">
            <p className="text-lg text-foreground">
              Your account has been created successfully.
            </p>
            <p className="text-muted-foreground">
              Please log in with the email and password you just created to access your dashboard.
            </p>
          </div>
          <Button onClick={handleContinue} size="lg" className="mt-4">
            Continue to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Success;
