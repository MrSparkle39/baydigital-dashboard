import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  UserPlus,
} from "lucide-react";
import {
  AU_STATES,
  ELIGIBILITY_OPTIONS,
  EMPTY_CHECKOUT_ACCOUNT,
  EMPTY_CUSTOMER_DETAILS,
  STEP_LABELS,
  STEP_ORDER,
  mapEntityTypeToEligibility,
  type CheckoutAccount,
  type CustomerDetails,
  type DomainCheckLiveResult,
  type DomainCheckLiveResponse,
  type DomainPriceDisplay,
  type PaymentState,
  type PurchaseStep,
  type RegisterResult,
  type TldPricingRow,
} from "@/types/domain-purchase";
import { DomainResultPricing } from "@/components/domain/DomainResultPricing";
import { buildDomainPriceDisplay, fetchDomainPricingTable } from "@/lib/domain/pricing";

const TOTAL_STEPS = STEP_ORDER.length;

export function DomainPurchaseFlow() {
  const { user } = useAuth();
  const [step, setStep] = useState<PurchaseStep>("search");
  const stepIndex = STEP_ORDER.indexOf(step);
  const progress = ((stepIndex + 1) / TOTAL_STEPS) * 100;

  // Step 1 — search
  const [query, setQuery] = useState("");
  const [checking, setChecking] = useState(false);
  const [searchResponse, setSearchResponse] = useState<DomainCheckLiveResponse | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<DomainCheckLiveResult | null>(null);
  const [pricingTable, setPricingTable] = useState<TldPricingRow[]>([]);

  // Step 2 — details
  const [details, setDetails] = useState<CustomerDetails>(EMPTY_CUSTOMER_DETAILS);
  const [abnLoading, setAbnLoading] = useState(false);

  // Step 3 — account at checkout, then payment (decoupled from register trigger)
  const [checkoutAccount, setCheckoutAccount] = useState<CheckoutAccount>(EMPTY_CHECKOUT_ACCOUNT);
  const [payment, setPayment] = useState<PaymentState>({ paymentVerified: false, mock: false });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);

  const accountReady = Boolean(user) || checkoutAccount.ready;

  // Step 4 — register
  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(null);

  const selectedDomainName = selectedDomain?.domain ?? "";

  const selectedPriceDisplay: DomainPriceDisplay | null = selectedDomain
    ? buildDomainPriceDisplay(selectedDomain.domain, pricingTable, selectedDomain.costPrice)
    : null;

  const checkoutAmount =
    selectedPriceDisplay?.registrationAmount ?? selectedDomain?.costPrice ?? null;

  // Cache pricing table on load (refreshes hourly via lib cache)
  useEffect(() => {
    fetchDomainPricingTable().then(({ pricing }) => setPricingTable(pricing));
  }, []);

  // Pre-fill checkout email from registrant details when entering payment step
  useEffect(() => {
    if (step === "payment" && details.email && !checkoutAccount.email) {
      setCheckoutAccount((prev) => ({ ...prev, email: details.email }));
    }
  }, [step, details.email, checkoutAccount.email]);

  const updateDetails = (field: keyof CustomerDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckDomain = async () => {
    const input = query.trim().toLowerCase();
    if (!input) {
      toast.error("Please enter a domain name");
      return;
    }

    setChecking(true);
    setSearchResponse(null);
    setSelectedDomain(null);

    try {
      const { data, error } = await supabase.functions.invoke("domain-check-live", {
        body: { query: input },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setSearchResponse({ query: input, mode: "single", results: [], error: data.error });
        return;
      }

      setSearchResponse(data as DomainCheckLiveResponse);
    } catch {
      toast.error("Couldn't check domain availability. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleSelectDomain = (result: DomainCheckLiveResult) => {
    setSelectedDomain(result);
    setStep("details");
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
   * ACQUISITION: account creation happens at checkout, not before search/details.
   * Visitors become Bay Digital users here. Replace placeholder with supabase.auth.signUp
   * or magic-link flow when wiring real auth.
   */
  const handleCreateAccountPlaceholder = async () => {
    const email = checkoutAccount.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email for your account");
      return;
    }
    if (checkoutAccount.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setAccountLoading(true);
    try {
      // TODO(acquisition): supabase.auth.signUp({ email, password, options: { ... } })
      setCheckoutAccount((prev) => ({ ...prev, email, ready: true }));
      toast.success("Account ready (placeholder — wire to real sign-up)");
    } finally {
      setAccountLoading(false);
    }
  };

  /**
   * SEQUENCING: real Stripe payment must be wired and verified BEFORE the real
   * register call is enabled, so domains are never registered without payment.
   *
   * Mock payment success is a separate dev-only path — it does NOT call domain-register.
   */
  const handleMockPaymentSuccess = async () => {
    if (!accountReady) {
      toast.error("Create your account before continuing to payment");
      return;
    }
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("domain-checkout", {
        body: { action: "mock-success", domain: selectedDomainName, costPrice: checkoutAmount },
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
    if (!accountReady) {
      toast.error("Create your account before continuing to payment");
      return;
    }
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("domain-checkout", {
        body: {
          action: "create-session",
          domain: selectedDomainName,
          costPrice: checkoutAmount,
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
          domain: selectedDomainName,
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
            <CardDescription>
              Enter a business name to check multiple extensions, or a full domain like yourbusiness.com.au
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="theinclusioncrew"
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
                Search
              </Button>
            </div>

            {checking && (
              <p className="text-sm text-muted-foreground">Checking availability across extensions…</p>
            )}

            {searchResponse?.error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>{searchResponse.error}</span>
              </div>
            )}

            {searchResponse && searchResponse.results.length > 0 && (
              <div className="rounded-lg border divide-y overflow-hidden">
                {searchResponse.results.map((result) => (
                  <div
                    key={result.domain}
                    className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                      result.available ? "bg-green-50/30 dark:bg-green-950/10" : "bg-muted/20"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{result.domain}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {result.available ? (
                          <Badge className="bg-green-600 hover:bg-green-600">Available</Badge>
                        ) : (
                          <Badge variant="secondary">Unavailable</Badge>
                        )}
                        {result.premium && <Badge variant="outline">Premium</Badge>}
                        {result.error && (
                          <span className="text-xs text-muted-foreground">{result.error}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-end">
                      {result.available && (
                        <DomainResultPricing
                          display={buildDomainPriceDisplay(
                            result.domain,
                            pricingTable,
                            result.costPrice,
                          )}
                          compact
                        />
                      )}
                      {result.available && (
                        <Button size="sm" onClick={() => handleSelectDomain(result)}>
                          Continue with this domain
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResponse &&
              searchResponse.results.length > 0 &&
              !searchResponse.results.some((r) => r.available) && (
                <p className="text-sm text-muted-foreground">
                  None of the checked extensions are available for &ldquo;{searchResponse.query}&rdquo;.
                  Try a different name.
                </p>
              )}
          </CardContent>
        </Card>
      )}

      {step === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>
              Registrant information for <strong>{selectedDomainName}</strong>
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
              Account & payment
            </CardTitle>
            <CardDescription>
              Create your account, then pay for <strong>{selectedDomainName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedPriceDisplay && (
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium">Registration cost</p>
                <DomainResultPricing display={selectedPriceDisplay} />
              </div>
            )}
            {/*
              ACQUISITION: visitors search and fill registrant details without logging in.
              Account creation / email capture happens here at checkout — this is when they
              become a registered Bay Digital user. Wire to supabase.auth.signUp or magic link.
            */}
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <p className="font-medium">Your Bay Digital account</p>
              </div>

              {user ? (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  Signed in as <strong>{user.email}</strong> — you can proceed to payment.
                </div>
              ) : checkoutAccount.ready ? (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Account ready for <strong>{checkoutAccount.email}</strong>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    No account needed until now. Enter your email and a password to continue —
                    we'll use this to manage your domain and send order updates.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="accountEmail">Email for your account *</Label>
                    <Input
                      id="accountEmail"
                      type="email"
                      placeholder="you@business.com.au"
                      value={checkoutAccount.email}
                      onChange={(e) =>
                        setCheckoutAccount((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountPassword">Password *</Label>
                    <Input
                      id="accountPassword"
                      type="password"
                      placeholder="At least 8 characters"
                      value={checkoutAccount.password}
                      onChange={(e) =>
                        setCheckoutAccount((prev) => ({ ...prev, password: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={handleCreateAccountPlaceholder}
                    disabled={accountLoading}
                  >
                    {accountLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create account & continue
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Placeholder — will call real sign-up when wired. Already have an account?{" "}
                    <a href="/login" className="text-primary hover:underline">
                      Log in
                    </a>
                  </p>
                </>
              )}
            </div>

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
              disabled={paymentLoading || !accountReady}
            >
              {paymentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pay with Stripe
            </Button>

            {!accountReady && (
              <p className="text-center text-xs text-muted-foreground">
                Create your account above to unlock payment
              </p>
            )}

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
                disabled={paymentLoading || !accountReady}
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
                : `Submit your registration request for ${selectedDomainName}`}
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
                    <strong>{selectedDomainName}</strong>
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
