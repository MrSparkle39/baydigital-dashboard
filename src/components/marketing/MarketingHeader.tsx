import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";

const NAV_LINKS = [
  { label: "Websites", to: "/#offer" },
  { label: "Domains", to: "/domains" },
  { label: "Email", to: "/#products" },
  { label: "Products", to: "/#products" },
  { label: "Pricing", to: "/#pricing" },
  { label: "Examples", to: "/#examples" },
];

export const MarketingHeader = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const goGetStarted = () => {
    setOpen(false);
    navigate("/#pricing");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/50 bg-white/40 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center" aria-label="Bay.Digital home">
          <img src={logo} alt="Bay.Digital" className="h-11 w-auto sm:h-12 lg:h-14" />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="text-sm font-medium text-bay-navy/80 transition-colors hover:text-bay-blue"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-bay-navy transition-colors hover:text-bay-blue"
          >
            Login
          </Link>
          <button
            onClick={goGetStarted}
            className="rounded-full bg-bay-blue px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-bay-blue/30 transition-all hover:bg-bay-blue-dark hover:shadow-md"
          >
            Get Started
          </button>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-bay-navy lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/50 bg-white/40 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-bay-navy/80 hover:bg-bay-mist hover:text-bay-blue"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-full border border-bay-grey px-4 py-2 text-center text-sm font-semibold text-bay-navy"
              >
                Login
              </Link>
              <button
                onClick={goGetStarted}
                className="rounded-full bg-bay-blue px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Get Started
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default MarketingHeader;
