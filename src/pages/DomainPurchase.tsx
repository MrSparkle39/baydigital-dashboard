import { DomainPurchaseFlow } from "@/components/domain/DomainPurchaseFlow";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Domain purchase page shell.
 *
 * Gated behind ProtectedRoute (subscriber-only) in App.tsx for now. This route
 * wrapper may later move into signup/onboarding for customer acquisition — keep
 * DomainPurchaseFlow decoupled from subscription/auth logic so it can be reused.
 */
export default function DomainPurchase() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Get a domain</h1>
          <p className="mt-2 text-muted-foreground">
            Search for a domain, enter your details, and complete payment. We'll register it for you.
          </p>
        </div>

        <DomainPurchaseFlow />
      </div>
    </div>
  );
}
