import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Globe,
  Mail,
  Server,
  ClipboardList,
  BarChart3,
  RefreshCw,
  LifeBuoy,
  LayoutTemplate,
  Users,
  ShieldCheck,
  Check,
  ArrowRight,
  Play,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { DomainSearch } from "@/components/marketing/DomainSearch";

const TRUST_POINTS = [
  "No lock-in contracts",
  "Business email included",
  "Domain included",
  "First draft in 48 hours",
];

const HERO_SERVICES = [
  "Websites",
  "Domains",
  "Business Email",
  "Automations",
  "Forms",
];

const OFFER_CARDS = [
  { icon: LayoutTemplate, title: "Website build", desc: "A modern, mobile-friendly website designed for your business." },
  { icon: Globe, title: "Domain name", desc: "Your own domain, registered and connected for you." },
  { icon: Mail, title: "Business email", desc: "Professional email at your domain, like hello@yourbusiness.com.au." },
  { icon: Server, title: "Hosting", desc: "Fast, secure hosting with SSL and daily backups." },
  { icon: ClipboardList, title: "Lead forms", desc: "Capture enquiries and leads straight from your site." },
  { icon: BarChart3, title: "Analytics", desc: "See what's working with simple, easy-to-read reports." },
  { icon: RefreshCw, title: "Updates", desc: "We keep your site fresh, secure and up to date." },
  { icon: LifeBuoy, title: "Support", desc: "Real humans, quick responses whenever you need help." },
];

const PRICING = [
  {
    name: "Lite",
    price: "$19",
    tagline: "A simple, professional online presence.",
    features: [
      "Domain included while subscribed",
      "Business email",
      "Single-page website",
      "Contact form",
      "Hosting and SSL",
      "No lock-in",
    ],
    recommended: false,
  },
  {
    name: "Starter",
    price: "$39",
    tagline: "Everything most small businesses need.",
    features: [
      "Everything in Lite",
      "Multi-page website",
      "Blog",
      "Analytics",
      "Multiple lead forms",
      "Website updates",
    ],
    recommended: true,
  },
  {
    name: "Growth",
    price: "$79",
    tagline: "For businesses ready to grow online.",
    features: [
      "Everything in Starter",
      "Social media tools",
      "Marketing tools",
      "Email campaigns",
      "Priority support",
      "More automation",
    ],
    recommended: false,
  },
];

const PRODUCTS = [
  { icon: LayoutTemplate, title: "Websites", desc: "Managed websites built and maintained for you." },
  { icon: Globe, title: "Domains", desc: "Search, register and manage your domain in one place." },
  { icon: Mail, title: "Bay Mail", desc: "Business email at your own domain." },
  { icon: ClipboardList, title: "FormDeck", desc: "Collect payments, bookings and leads with powerful forms." },
  { icon: Users, title: "Seconded", desc: "Delegate tasks to a support team so you get more done." },
  { icon: ShieldCheck, title: "Compliance", desc: "Stay compliant and protect your business with simple tools." },
];

const EXAMPLES = [
  { name: "Bay City Plumbing", type: "Trades" },
  { name: "Harbour Netball Club", type: "Community club" },
  { name: "Coastal Care Supports", type: "NDIS provider" },
];

const SectionHeading = ({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) => (
  <div className="mx-auto max-w-2xl text-center">
    {eyebrow && (
      <span className="text-sm font-semibold uppercase tracking-wider text-bay-blue">{eyebrow}</span>
    )}
    <h2 className="mt-2 text-3xl font-bold tracking-tight text-bay-navy sm:text-4xl">{title}</h2>
    {subtitle && <p className="mt-4 text-lg text-bay-navy/60">{subtitle}</p>}
  </div>
);

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // React Router doesn't scroll to hash targets automatically.
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0 });
  }, [location]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f7f9ff_38%,#e8efff_65%,#86a2ff_100%)] text-bay-navy">
      <MarketingHeader />

      {/* Decorative layers live on the page — not clipped to the hero section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(920px,105vh)]"
      >
        <picture className="absolute right-[-6%] top-[120px] z-0 w-[65vw] max-w-[980px] max-md:right-[-14%] max-md:top-[88px] max-md:w-[92vw]">
          <source
            type="image/webp"
            srcSet="/images/hero-bg.webp 1024w, /images/hero-bg@2x.webp 2048w"
            sizes="(max-width: 768px) 92vw, 65vw"
          />
          <img
            src="/images/hero-bg.png"
            srcSet="/images/hero-bg.png 1024w, /images/hero-bg@2x.png 2048w"
            sizes="(max-width: 768px) 92vw, 65vw"
            width={2048}
            height={1364}
            alt=""
            decoding="async"
            fetchPriority="high"
            className="hero-artwork-mask h-auto w-full object-contain object-right opacity-95 saturate-[1.12] contrast-[1.08] max-md:opacity-75 max-md:saturate-[1.08] md:opacity-95"
          />
        </picture>
        <div className="absolute left-0 top-[72px] h-[min(760px,88vh)] w-full max-w-[min(960px,72vw)] bg-[radial-gradient(ellipse_95%_72%_at_0%_22%,white_0%,rgba(255,255,255,0.82)_38%,transparent_70%)]" />
      </div>

      {/* Hero content */}
      <section className="relative z-10 min-h-[720px]">
        <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-8 sm:px-6 lg:px-8 lg:pt-32">
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-full border border-bay-blue/15 bg-white/80 px-3 py-1 text-xs font-semibold text-bay-blue backdrop-blur-sm">
              Websites · Domains · Email · Tools
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-bay-navy sm:text-5xl lg:text-[3.35rem]">
              We build your website.
              <br />
              <span className="text-bay-blue">You run your business.</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-bay-navy/60">
              Everything your business needs online. One simple monthly price.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/#pricing")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-bay-blue px-7 py-3.5 font-semibold text-white shadow-lg shadow-bay-blue/25 transition-colors hover:bg-bay-blue-dark"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/#offer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-bay-navy/10 bg-white/80 px-7 py-3.5 font-semibold text-bay-navy backdrop-blur-sm transition-colors hover:border-bay-blue/30 hover:text-bay-blue"
              >
                <Play className="h-4 w-4 fill-current" />
                See how it works
              </Link>
            </div>

            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2 text-sm font-medium text-bay-navy/70">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bay-blue/10">
                    <Check className="h-3 w-3 text-bay-blue" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-10 border-t border-bay-navy/10 pt-6">
              <p className="text-sm font-medium text-bay-navy/70">
                Built for small businesses, clubs and service providers
              </p>
              <p className="mt-2 text-sm font-semibold text-bay-navy/50">
                {HERO_SERVICES.join(" · ")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main offer */}
      <section id="offer" className="relative z-10 scroll-mt-20 bg-transparent px-4 pt-12 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="What's included"
            title="Everything your business needs online"
            subtitle="One simple monthly price. We handle the technical side so you can focus on your customers."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {OFFER_CARDS.map((card) => (
              <div
                key={card.title}
                className="group rounded-2xl border border-bay-grey bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-bay-blue/30 hover:shadow-lg hover:shadow-bay-navy/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-bay-mist text-bay-blue transition-colors group-hover:bg-bay-blue group-hover:text-white">
                  <card.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-bay-navy">{card.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-bay-navy/60">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domain section */}
      <section id="domains" className="relative z-10 scroll-mt-20 bg-transparent py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Domains"
            title="Find your business domain"
            subtitle="Search for your domain and launch your website, email and hosting from one simple Bay.Digital plan."
          />
          <div className="mx-auto mt-10 max-w-2xl text-left">
            <DomainSearch variant="full" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 scroll-mt-20 bg-transparent py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Pricing"
            title="One simple monthly price"
            subtitle="No lock-in contracts. Your domain is included while subscribed, and you own your domain."
          />
          <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl border bg-white p-7 transition-all ${
                  plan.recommended
                    ? "border-bay-blue shadow-2xl shadow-bay-blue/15 lg:-translate-y-3 lg:scale-[1.02]"
                    : "border-bay-grey shadow-sm hover:shadow-lg hover:shadow-bay-navy/5"
                }`}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-bay-blue px-4 py-1 text-xs font-semibold text-white shadow-md">
                    Recommended
                  </span>
                )}
                <h3 className="text-lg font-bold text-bay-navy">{plan.name}</h3>
                <p className="mt-1 text-sm text-bay-navy/55">{plan.tagline}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-bay-navy">{plan.price}</span>
                  <span className="text-bay-navy/50">/month</span>
                </div>
                <button
                  onClick={() => navigate("/login")}
                  className={`mt-6 w-full rounded-full px-5 py-3 font-semibold transition-all ${
                    plan.recommended
                      ? "bg-bay-blue text-white shadow-lg shadow-bay-blue/25 hover:bg-bay-blue-dark"
                      : "border border-bay-navy/15 text-bay-navy hover:border-bay-blue/40 hover:text-bay-blue"
                  }`}
                >
                  Get Started
                </button>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-bay-navy/75">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-bay-blue/10">
                        <Check className="h-2.5 w-2.5 text-bay-blue" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-bay-navy/55">
            Every plan includes your domain, business email, hosting and support — included while subscribed.
          </p>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="relative z-10 scroll-mt-20 bg-transparent py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The ecosystem"
            title="More tools from Bay.Digital"
            subtitle="Simple products that help you run and grow your business — all in one place."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((product) => (
              <div
                key={product.title}
                className="flex items-start gap-4 rounded-2xl border border-bay-grey bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-bay-navy/5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-bay-blue to-bay-blue-dark text-white">
                  <product.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-bay-navy">{product.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-bay-navy/60">{product.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="relative z-10 scroll-mt-20 bg-transparent py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Examples"
            title="Built for businesses like yours"
            subtitle="Tradies, clubs, NDIS providers and community organisations across Australia."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <div key={ex.name} className="overflow-hidden rounded-2xl border border-bay-grey bg-white shadow-sm">
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-bay-navy to-bay-navy-deep">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{ex.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-bay-sky">{ex.type}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm font-medium text-bay-navy">{ex.name}</span>
                  <span className="text-xs font-medium text-bay-blue">View site</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative z-10 bg-transparent px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-bay-navy to-bay-navy-deep px-8 py-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to get your business online?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Get your website, domain and business email from one simple monthly plan. First draft in 48 hours.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/#pricing")}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-bay-blue px-7 py-3.5 font-semibold text-white shadow-lg shadow-bay-blue/30 transition-all hover:bg-bay-blue-dark"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/domains"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-3.5 font-semibold text-white transition-all hover:bg-white/10"
            >
              Search Domains
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
};

export default Home;
