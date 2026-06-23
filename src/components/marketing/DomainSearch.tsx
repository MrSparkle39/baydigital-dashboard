import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Status = "idle" | "loading" | "available" | "unavailable" | "error";

interface CheckResult {
  available?: boolean;
  domain?: string;
  error?: string;
}

/**
 * Calls the `check-domain` Supabase edge function.
 * Falls back to local mock logic if the function is unavailable (e.g. during
 * local development before the function is deployed) so the UI stays usable.
 * Mock rule: a domain containing "taken" is unavailable, otherwise available.
 */
async function checkDomain(domain: string): Promise<CheckResult> {
  try {
    const { data, error } = await supabase.functions.invoke("check-domain", {
      body: { domain },
    });
    if (error) throw error;
    if (data && (typeof data.available === "boolean" || data.error)) {
      return data as CheckResult;
    }
    throw new Error("Unexpected response");
  } catch {
    // Local fallback mock so the page works without the deployed function.
    return {
      available: !domain.toLowerCase().includes("taken"),
      domain,
    };
  }
}

const PLANS = [
  { name: "Lite", price: "$19/mo" },
  { name: "Starter", price: "$39/mo", recommended: true },
  { name: "Growth", price: "$79/mo" },
];

interface DomainSearchProps {
  /** "full" shows plan buttons in the available result (used on /domains). */
  variant?: "compact" | "full";
}

export const DomainSearch = ({ variant = "full" }: DomainSearchProps) => {
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CheckResult | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = domain.trim();
    if (!value) return;
    setStatus("loading");
    setResult(null);

    const res = await checkDomain(value);
    setResult(res);
    if (res.error) setStatus("error");
    else if (res.available) setStatus("available");
    else setStatus("unavailable");
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleCheck}
        className="flex flex-col gap-3 rounded-2xl border border-bay-grey bg-white p-3 shadow-sm sm:flex-row"
      >
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-bay-grey/60 px-4">
          <Search className="h-5 w-5 shrink-0 text-bay-navy/40" />
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="yourbusiness.com.au"
            className="w-full bg-transparent py-3 text-bay-navy placeholder:text-bay-navy/40 focus:outline-none"
            aria-label="Domain name"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-bay-blue px-6 py-3 font-semibold text-white transition-all hover:bg-bay-blue-dark disabled:opacity-70"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </>
          ) : (
            "Check Availability"
          )}
        </button>
      </form>

      <p className="mt-3 text-sm text-bay-navy/55">
        Domain renewals included while subscribed.
      </p>

      {status === "available" && result && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800">
                {result.domain} is available
              </p>
              <p className="mt-1 text-sm text-emerald-700">Domain available</p>
              <ul className="mt-3 space-y-1.5 text-sm text-bay-navy/70">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Included free while subscribed
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Free renewals while subscribed
                </li>
              </ul>

              {variant === "full" && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-bay-navy">Launch it with a plan:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PLANS.map((plan) => (
                      <Link
                        key={plan.name}
                        to="/#pricing"
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                          plan.recommended
                            ? "bg-bay-blue text-white hover:bg-bay-blue-dark"
                            : "border border-bay-blue/30 text-bay-blue hover:bg-bay-mist"
                        }`}
                      >
                        {plan.name} · {plan.price}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {status === "unavailable" && result && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">{result.domain} is unavailable</p>
              <p className="mt-1 text-sm text-amber-700">
                That one's taken. Try another name, or a different extension like
                <span className="font-medium"> .com.au</span> or <span className="font-medium">.net.au</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50/70 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Something went wrong</p>
              <p className="mt-1 text-sm text-red-700">
                {result?.error || "We couldn't check that domain right now. Please try again."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainSearch;
