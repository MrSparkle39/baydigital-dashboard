import { TrendingUp, Users, FileText, Globe } from "lucide-react";

/**
 * Pure CSS/HTML SaaS hero mockup. No external/paid assets.
 * Shows an example business website preview with floating Bay.Digital
 * dashboard cards (leads, analytics, forms).
 */
export const HeroMockup = () => {
  return (
    <div className="relative">
      {/* Soft blue glow behind the mockup */}
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-bay-blue/15 via-bay-sky/10 to-transparent blur-2xl" />

      {/* Browser window: example business site */}
      <div className="overflow-hidden rounded-2xl border border-bay-grey bg-white shadow-2xl shadow-bay-navy/10">
        <div className="flex items-center gap-2 border-b border-bay-grey bg-bay-grey/50 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <div className="ml-3 flex-1 rounded-md bg-white px-3 py-1 text-xs text-bay-navy/50">
            baycityplumbing.com.au
          </div>
        </div>

        <div className="p-5">
          {/* Faux site nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-bay-sky to-bay-blue-dark" />
              <div className="h-3 w-24 rounded bg-bay-navy/80" />
            </div>
            <div className="hidden gap-2 sm:flex">
              <div className="h-2.5 w-12 rounded bg-bay-navy/15" />
              <div className="h-2.5 w-12 rounded bg-bay-navy/15" />
              <div className="h-2.5 w-12 rounded bg-bay-navy/15" />
              <div className="h-6 w-16 rounded-full bg-bay-blue" />
            </div>
          </div>

          {/* Faux hero */}
          <div className="mt-5 rounded-xl bg-gradient-to-br from-bay-navy to-bay-navy-deep p-5">
            <div className="h-3 w-40 rounded bg-white/80" />
            <div className="mt-2 h-3 w-28 rounded bg-bay-sky" />
            <div className="mt-4 h-7 w-24 rounded-full bg-bay-blue" />
          </div>

          {/* Faux services row */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-bay-grey p-3">
                <div className="h-6 w-6 rounded-md bg-bay-mist" />
                <div className="mt-2 h-2 w-full rounded bg-bay-navy/10" />
                <div className="mt-1 h-2 w-2/3 rounded bg-bay-navy/10" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating dashboard card: leads / visitors */}
      <div className="absolute -right-4 -top-6 hidden w-56 rounded-2xl border border-bay-grey bg-white p-4 shadow-xl shadow-bay-navy/10 sm:block md:-right-10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-bay-navy/60">Your Website</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Live
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="rounded-lg bg-bay-mist p-2">
            <Users className="h-4 w-4 text-bay-blue" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none text-bay-navy">37</p>
            <p className="text-[11px] text-bay-navy/50">Leads this month</p>
          </div>
          <span className="ml-auto inline-flex items-center text-[11px] font-semibold text-emerald-600">
            <TrendingUp className="mr-0.5 h-3 w-3" /> +24%
          </span>
        </div>
        <div className="mt-3 flex items-end gap-1">
          {[40, 55, 35, 70, 60, 85, 75].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-gradient-to-t from-bay-blue/40 to-bay-blue"
              style={{ height: `${h * 0.5}px` }}
            />
          ))}
        </div>
      </div>

      {/* Floating analytics card */}
      <div className="absolute -bottom-6 -left-4 hidden w-48 rounded-2xl border border-bay-grey bg-white p-4 shadow-xl shadow-bay-navy/10 sm:block md:-left-10">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-bay-mist p-2">
            <TrendingUp className="h-4 w-4 text-bay-blue" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none text-bay-navy">1,246</p>
            <p className="text-[11px] text-bay-navy/50">Visitors</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-1.5 w-full rounded-full bg-bay-mist">
            <div className="h-1.5 w-4/5 rounded-full bg-bay-blue" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-bay-mist">
            <div className="h-1.5 w-3/5 rounded-full bg-bay-sky" />
          </div>
        </div>
      </div>

      {/* Floating forms chip */}
      <div className="absolute right-6 bottom-8 hidden items-center gap-2 rounded-xl border border-bay-grey bg-white px-3 py-2 shadow-lg shadow-bay-navy/10 md:flex">
        <FileText className="h-4 w-4 text-bay-blue" />
        <span className="text-xs font-medium text-bay-navy">New form submission</span>
      </div>

      {/* Floating domain chip */}
      <div className="absolute left-8 top-10 hidden items-center gap-2 rounded-xl border border-bay-grey bg-white px-3 py-2 shadow-lg shadow-bay-navy/10 lg:flex">
        <Globe className="h-4 w-4 text-bay-blue" />
        <span className="text-xs font-medium text-bay-navy">Domain connected</span>
      </div>
    </div>
  );
};

export default HeroMockup;
