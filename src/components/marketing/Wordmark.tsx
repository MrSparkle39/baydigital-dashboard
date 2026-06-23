interface WordmarkProps {
  /** Use "light" on dark backgrounds (white text), "dark" on light backgrounds. */
  variant?: "light" | "dark";
  className?: string;
}

/**
 * Text wordmark rendering of the Bay.Digital brand.
 * Used where the PNG logo can't be shown (e.g. the dark navy footer).
 * Always renders the "Bay.Digital" styling with a bright-blue dot.
 */
export const Wordmark = ({ variant = "dark", className = "" }: WordmarkProps) => {
  const textColor = variant === "light" ? "text-white" : "text-bay-navy";
  return (
    <span className={`inline-flex items-center text-xl font-bold tracking-tight ${textColor} ${className}`}>
      Bay<span className="text-bay-blue">.</span>Digital
    </span>
  );
};

export default Wordmark;
