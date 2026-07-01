export type PurchaseStep = "search" | "details" | "payment" | "confirm";

export interface DomainCheckLiveResult {
  domain: string;
  available: boolean;
  status: string;
  costPrice: number | null;
  premium: boolean;
  raw?: Record<string, unknown>;
  error?: string;
}

export interface AbnLookupResult {
  abn: string;
  entityName: string;
  entityTypeName: string;
  entityTypeCode: string;
  abnStatus: string;
  error?: string;
  configured?: boolean;
}

export type EligibilityType =
  | "Sole Trader"
  | "Company"
  | "Registered Business"
  | "Partnership"
  | "Trust"
  | "Other";

export const ELIGIBILITY_OPTIONS: EligibilityType[] = [
  "Sole Trader",
  "Company",
  "Registered Business",
  "Partnership",
  "Trust",
  "Other",
];

export const AU_STATES = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
] as const;

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  organisation: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  email: string;
  abn: string;
  eligibilityType: EligibilityType | "";
}

export interface PaymentState {
  /** True only after verified Stripe payment or explicit mock-success path. */
  paymentVerified: boolean;
  mock: boolean;
}

export interface RegisterResult {
  status: string;
  message: string;
  domain: string;
  error?: string;
}

/** Map ABR entity type names to eligibility dropdown values where possible. */
export function mapEntityTypeToEligibility(entityTypeName: string): EligibilityType | "" {
  const normalized = entityTypeName.toLowerCase();
  if (normalized.includes("sole trader") || normalized.includes("individual")) return "Sole Trader";
  if (normalized.includes("company") || normalized.includes("pty")) return "Company";
  if (normalized.includes("partnership")) return "Partnership";
  if (normalized.includes("trust")) return "Trust";
  if (normalized.includes("business") || normalized.includes("trading")) return "Registered Business";
  return "";
}

export const EMPTY_CUSTOMER_DETAILS: CustomerDetails = {
  firstName: "",
  lastName: "",
  organisation: "",
  address: "",
  suburb: "",
  state: "",
  postcode: "",
  country: "AU",
  phone: "",
  email: "",
  abn: "",
  eligibilityType: "",
};

export const STEP_LABELS: Record<PurchaseStep, string> = {
  search: "Search",
  details: "Your details",
  payment: "Payment",
  confirm: "Confirmation",
};

export const STEP_ORDER: PurchaseStep[] = ["search", "details", "payment", "confirm"];
