import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Loader2,
  Search,
  CreditCard,
  Clock,
} from "lucide-react";
import {
  AU_STATES,
  ELIGIBILITY_OPTIONS,
  EMPTY_CUSTOMER_DETAILS,
  STEP_LABELS,
  STEP_ORDER,
  mapEntityTypeToEligibility,
  type CustomerDetails,
  type DomainCheckLiveResult,
  type PaymentState,
  type PurchaseStep,
  type RegisterResult,
} from "@/types/domain-purchase";

const TOTAL_STEPS = STEP_ORDER.length;

export function DomainPurchaseFlow() {
  const [step, setStep] = useState<PurchaseStep>("search");
  const stepIndex = STEP_ORDER.indexOf(step);
  const progress = ((stepIndex + 1) / TOTAL_STEPS) * 100;

  // Step 1 — search
  const [query, setQuery] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<DomainCheckLiveResult | null>(null);

  // Step 2 — details
  const [details, setDetails] = useState<CustomerDetails>(EMPTY_CUSTOMER_DETAILS);
  const [abnLoading, setAbnLoading] = useState(false);

  // Step 3 — payment (decoupled from register trigger)
  const [payment, setPayment] = useState<PaymentState>({ paymentVerified: false, mock: false });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Step 4 — register
  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(null);

  const selectedDomain = checkResult?.domain ?? query.trim().toLowerCase();

  const updateDetails = (field: keyof CustomerDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckDomain = async () => {
    const domain = query.trim().toLowerCase();
    if (!domain) {
      toast.error("Please enter a domain name");
      return;
    }

    setChecking(true);
    setCheckResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("domain-check-live", {
        body: { domain },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setCheckResult({ domain, available: false, status: "error", costPrice: null, premium: false, error: data.error });
        return;
      }

      setCheckResult(data as DomainCheckLiveResult);
    } catch {
      toast.error("Couldn't check domain availability. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleAbnLookup = async () => {
    const abn = details.abn.replace(/\s/g, "");
    if (!/^\d{11}$/.test(abn)) {
      toast.error("Enter a valid 11-digit ABN");
      return;
    }

    setAbnLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("abn-lookup", { body: { abn } });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const mapped = mapEntityTypeToEligibility(data.entityTypeName ?? "");
      setDetails((prev) => ({
        ...prev,
        abn: data.abn ?? abn,
        organisation: data.entityName || prev.organisation,
        eligibilityType: mapped || prev.eligibilityType,
      }));
      toast.success("ABN details loaded");
    } catch {
      toast.error("ABN lookup failed. Please try again.");
    } finally {
      setAbnLoading(false);
    }
  };

  const validateDetails = (): boolean => {
    const required: (keyof CustomerDetails)[] = [
      "firstName",
      "lastName",
      "address",
      "suburb",
      "state",
      "postcode",
      "phone",
      "email",
      "eligibilityType",
    ];
    for (const field of required) {
      if (!details[field]?.trim()) {
        toast.error(`Please complete all required fields`);
        return false;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    return true;
  };

  /**
   * SEQUENCING: real Stripe payment must be wired and verified BEFORE the real
   * register call is enabled, so domains are never registered without payment.
   *
   * Mock payment success is a separate dev-only path — it does NOT call domain-register.
   */
  const handleMockPaymentSuccess = async () => {
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("domain-checkout", {
        body: { action: "mock-success", domain: selectedDomain, costPrice: checkResult?.costPrice },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setPayment({ paymentVerified: true, mock: true });
      toast.success("Mock payment recorded (dev only)");
      setStep("confirm");
    } catch {
      toast.error("Payment step failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleStripeCheckout = async () => {
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("domain-checkout", {
        body: {
          action: "create-session",
          domain: selectedDomain,
          costPrice: checkResult?.costPrice,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      toast.error(data?.error ?? "Stripe checkout is not configured yet.");
    } catch {
      toast.error("Couldn't start checkout. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  /** Register is triggered only on the confirm step, after paymentVerified is true. */
  const handleRegister = async () => {
    if (!payment.paymentVerified) {
      toast.error("Payment must be completed before registration.");
      return;
    }

    setRegistering(true);
    try {
      const { data, error } = await supabase.functions.invoke("domain-register", {
        body: {
          domain: selectedDomain,
          firstName: details.firstName,
          lastName: details.lastName,
          organisation: details.organisation,
          address: details.address,
          suburb: details.suburb,
          state: details.state,
          postcode: details.postcode,
          country: details.country,
          phone: details.phone,
          email: details.email,
          abn: details.abn,
          eligibilityType: details.eligibilityType,
          paymentVerified: payment.paymentVerified,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setRegisterResult(data as RegisterResult);
    } catch {
      toast.error("Registration request failed. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Step {stepIndex + 1} of {TOTAL_STEPS}: {STEP_LABELS[step]}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {step === "search" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Search for a domain
            </CardTitle>
            <CardDescription>Enter the domain you'd like to register, e.g. yourbusiness.com.au</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="yourbusiness.com.au"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheckDomain()}
                disabled={checking}
              />
              <Button onClick={handleCheckDomain} disabled={checking} className="shrink-0">
                {checking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Check availability
              </Button>
            </div>

            {checkResult && !checkResult.error && (
              <div
                className={`rounded-lg border p-4 ${
                  checkResult.available ? "border-green-200 bg-green-50/50" : "border-muted bg-muted/30"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{checkResult.domain}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {checkResult.available ? (
                        <Badge className="bg-green-600 hover:bg-green-600">Available</Badge>
                      ) : (
                        <Badge variant="secondary">Unavailable</Badge>
                      )}
                      {checkResult.premium && <Badge variant="outline">Premium</Badge>}
                      {checkResult.status && (
                        <span className="text-sm text-muted-foreground">{checkResult.status}</span>
                      )}
                    </div>
                  </div>
                  {checkResult.available && checkResult.costPrice != null && (
                    <p className="text-lg font-bold">${checkResult.costPrice.toFixed(2)}</p>
                  )}
                </div>
              </div>
            )}

            {checkResult?.error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>{checkResult.error}</span>
              </div>
            )}

            {checkResult?.available && (
              <Button className="w-full sm:w-auto" onClick={() => setStep("details")}>
                Continue with this domain
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {step === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>
              Registrant information for <strong>{selectedDomain}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name *</Label>
                <Input
                  id="firstName"
                  value={details.firstName}
                  onChange={(e) => updateDetails("firstName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name *</Label>
                <Input
                  id="lastName"
                  value={details.lastName}
                  onChange={(e) => updateDetails("lastName", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organisation">Organisation</Label>
              <Input
                id="organisation"
                value={details.organisation}
                onChange={(e) => updateDetails("organisation", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={details.address}
                onChange={(e) => updateDetails("address", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb *</Label>
                <Input
                  id="suburb"
                  value={details.suburb}
                  onChange={(e) => updateDetails("suburb", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select value={details.state} onValueChange={(v) => updateDetails("state", v)}>
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {AU_STATES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode *</Label>
                <Input
                  id="postcode"
                  value={details.postcode}
                  onChange={(e) => updateDetails("postcode", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={details.country} disabled />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={details.phone}
                  onChange={(e) => updateDetails("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={details.email}
                  onChange={(e) => updateDetails("email", e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
              <p className="text-sm font-medium">ABN & eligibility</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="11-digit ABN"
                  value={details.abn}
                  onChange={(e) => updateDetails("abn", e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAbnLookup}
                  disabled={abnLoading}
                  className="shrink-0"
                >
                  {abnLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Look up ABN
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eligibility">Eligibility type *</Label>
                <Select
                  value={details.eligibilityType}
                  onValueChange={(v) => updateDetails("eligibilityType", v)}
                >
                  <SelectTrigger id="eligibility">
                    <SelectValue placeholder="Select eligibility type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ELIGIBILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setStep("search")}>
                Back
              </Button>
              <Button
                onClick={() => {
                  if (validateDetails()) setStep("payment");
                }}
              >
                Continue to payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "payment" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment
            </CardTitle>
            <CardDescription>
              Complete payment for <strong>{selectedDomain}</strong>
              {checkResult?.costPrice != null && ` — $${checkResult.costPrice.toFixed(2)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/*
              SEQUENCING: real Stripe payment must be wired and verified BEFORE the real
              register call is enabled, so domains are never registered without payment.
            */}
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Stripe checkout will be enabled once <code className="text-xs">STRIPE_SECRET_KEY</code> is
              configured on the Edge Function. Registration only runs after verified payment.
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleStripeCheckout}
              disabled={paymentLoading}
            >
              {paymentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pay with Stripe
            </Button>

            {/* Mock path — clearly separated from register; dev/staging only */}
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Development only</p>
              <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
                Simulates a successful payment without charging. Does not register the domain — that
                happens on the next step after you confirm.
              </p>
              <Button
                variant="outline"
                className="mt-3 w-full border-amber-300"
                onClick={handleMockPaymentSuccess}
                disabled={paymentLoading}
              >
                Simulate payment success (mock)
              </Button>
            </div>

            <Button variant="outline" onClick={() => setStep("details")}>
              Back
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {registerResult ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-primary" />
              )}
              {registerResult ? "Request received" : "Confirm registration"}
            </CardTitle>
            <CardDescription>
              {registerResult
                ? registerResult.message
                : `Submit your registration request for ${selectedDomain}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {payment.mock && (
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                Mock payment — dev only
              </Badge>
            )}

            {!registerResult ? (
              <>
                <div className="rounded-lg border p-4 text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Domain:</span>{" "}
                    <strong>{selectedDomain}</strong>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Registrant:</span>{" "}
                    {details.firstName} {details.lastName}
                  </p>
                  {details.organisation && (
                    <p>
                      <span className="text-muted-foreground">Organisation:</span>{" "}
                      {details.organisation}
                    </p>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  The registrar endpoint is being finalised. You'll see a processing confirmation
                  once submitted — we'll notify you when the domain is live.
                </p>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleRegister}
                  disabled={registering || !payment.paymentVerified}
                >
                  {registering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit registration request
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50/50 p-6 text-center dark:border-green-900 dark:bg-green-950/20">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                <p className="mt-4 font-semibold">{registerResult.domain}</p>
                <p className="mt-2 text-sm text-muted-foreground">{registerResult.message}</p>
                <Badge className="mt-4" variant="secondary">
                  {registerResult.status}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
