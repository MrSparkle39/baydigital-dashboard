import { useEffect } from "react";
import { Globe, Mail, Server, RefreshCw, ShieldCheck, Check } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { DomainSearch } from "@/components/marketing/DomainSearch";

const INCLUDED = [
  { icon: Globe, title: "Your own domain", desc: "Registered and connected for you — and you own it." },
  { icon: Mail, title: "Business email", desc: "Professional email at your domain, included while subscribed." },
  { icon: Server, title: "Hosting & SSL", desc: "Fast, secure hosting with a free SSL certificate." },
  { icon: RefreshCw, title: "Free renewals", desc: "Domain renewals are included while you're subscribed." },
];

const Domains = () => {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="min-h-screen bg-white text-bay-navy">
      <MarketingHeader />

      {/* Hero + search */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-bay-mist to-white" />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-24 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-bay-blue/20 bg-white px-3 py-1 text-xs font-semibold text-bay-blue">
            <Globe className="h-3.5 w-3.5" /> Domain search
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-bay-navy sm:text-5xl">
            Find your business domain
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-bay-navy/65">
            Search for your domain and launch your website, email and hosting from one simple
            Bay.Digital plan.
          </p>

          <div className="mx-auto mt-10 max-w-2xl text-left">
            <DomainSearch variant="full" />
          </div>
        </div>
      </section>

      {/* What's included with every domain */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-bay-navy sm:text-3xl">
              Your domain, fully managed
            </h2>
            <p className="mt-3 text-bay-navy/60">
              Every Bay.Digital plan includes your domain and everything you need to use it.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {INCLUDED.map((item) => (
              <div key={item.title} className="rounded-2xl border border-bay-grey bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-bay-mist text-bay-blue">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-bay-navy">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-bay-navy/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reassurance band */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-3xl border border-bay-grey bg-bay-mist px-8 py-10 text-center">
          <div className="flex items-center gap-2 text-bay-blue">
            <ShieldCheck className="h-6 w-6" />
            <span className="font-semibold">You own your domain</span>
          </div>
          <p className="max-w-2xl text-bay-navy/65">
            No lock-in contracts. Your domain and business email are included while subscribed, and
            renewals are on us. Cancel any time — your domain stays yours.
          </p>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-bay-navy/75">
            {["Domain included while subscribed", "Free renewals while subscribed", "No lock-in"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-bay-blue" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Domains;
