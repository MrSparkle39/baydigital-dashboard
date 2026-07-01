import { DomainPurchaseFlow } from "@/components/domain/DomainPurchaseFlow";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

/**
 * Public domain purchase page — no login required.
 *
 * Intentionally outside ProtectedRoute: domain purchase is a customer-acquisition
 * tool. Visitors search and enter registrant details freely; account creation
 * happens at checkout inside DomainPurchaseFlow (decoupled from route auth).
 */
export default function DomainPurchase() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(user ? "/dashboard" : "/domains")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {user ? "Back to dashboard" : "Back to domains"}
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Get a domain</h1>
          <p className="mt-2 text-muted-foreground">
            Search for a domain and enter your details — no account needed to start. You'll create
            your Bay Digital account when you're ready to pay.
          </p>
          {!user && (
            <p className="mt-2 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </p>
          )}
        </div>

        <DomainPurchaseFlow />
      </div>
    </div>
  );
}
