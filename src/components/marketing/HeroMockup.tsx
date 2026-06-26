/**
 * Hero sculpture — integrated into the page gradient via glow layers,
 * absolute positioning (desktop), and a slow float. No visible container box.
 */
export const HeroMockup = () => {
  return (
    <div
      className="hero-sculpture pointer-events-none relative z-0 mx-auto mt-10 w-full max-w-[min(420px,88vw)] lg:absolute lg:right-[-7%] lg:top-[7.5rem] lg:mx-0 lg:mt-0 lg:w-[min(1050px,58vw)] lg:max-w-none xl:right-[-5%] xl:w-[1100px]"
      aria-hidden
    >
      {/* Ambient glow — large blurred radial layers */}
      <div
        className="absolute left-1/2 top-[42%] h-[min(520px,70vw)] w-[min(520px,70vw)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl lg:h-[680px] lg:w-[680px] lg:opacity-80"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.45) 0%, rgba(34,211,238,0.12) 42%, transparent 72%)",
        }}
      />
      <div
        className="absolute left-[58%] top-[48%] h-[min(440px,62vw)] w-[min(440px,62vw)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl lg:h-[580px] lg:w-[580px] lg:opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(30,107,255,0.5) 0%, rgba(30,107,255,0.15) 45%, transparent 70%)",
        }}
      />
      <div
        className="absolute left-[42%] top-[55%] h-[min(380px,55vw)] w-[min(380px,55vw)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl lg:h-[500px] lg:w-[500px] lg:opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0.1) 40%, transparent 68%)",
        }}
      />

      {/* Sculpture */}
      <img
        src="/images/hero-visual.png?v=8"
        alt=""
        className="hero-sculpture-float relative z-10 mx-auto h-auto w-full object-contain lg:w-full"
        style={{
          filter:
            "drop-shadow(0 28px 64px rgba(30,107,255,0.22)) drop-shadow(0 0 48px rgba(34,211,238,0.18)) drop-shadow(0 0 80px rgba(139,92,246,0.12))",
        }}
        width={612}
        height={408}
        loading="eager"
        decoding="async"
      />
    </div>
  );
};

export default HeroMockup;
