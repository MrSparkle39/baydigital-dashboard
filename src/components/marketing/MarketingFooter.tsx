import { Link } from "react-router-dom";
import { Wordmark } from "./Wordmark";

const FOOTER_COLS = [
  {
    title: "Product",
    links: [
      { label: "Websites", to: "/#offer" },
      { label: "Domains", to: "/domains" },
      { label: "Bay Mail", to: "/#products" },
      { label: "Pricing", to: "/#pricing" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "FormDeck", to: "/#products" },
      { label: "Seconded", to: "/#products" },
      { label: "Compliance", to: "/#products" },
      { label: "Examples", to: "/#examples" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Login", to: "/login" },
      { label: "Get Started", to: "/#pricing" },
      { label: "Find a Domain", to: "/domains" },
    ],
  },
];

export const MarketingFooter = () => {
  return (
    <footer className="bg-bay-navy-deep text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-sm">
            <Wordmark variant="light" />
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Managed websites, domains, business email and simple digital tools for small
              businesses, tradies, clubs and community organisations. One simple monthly price.
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/50 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Bay.Digital. All rights reserved.</p>
          <p>You own your domain. No lock-in contracts.</p>
        </div>
      </div>
    </footer>
  );
};

export default MarketingFooter;
