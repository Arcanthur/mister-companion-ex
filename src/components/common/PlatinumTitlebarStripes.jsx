export function PlatinumStripeSet({ side }) {
  return (
    <span className={`platinum-titlebar-stripe-set platinum-titlebar-stripe-set-${side}`} aria-hidden="true">
      <span className="platinum-titlebar-stripe-cap platinum-titlebar-stripe-cap-left" />
      <span className="platinum-titlebar-stripe-center" />
      <span className="platinum-titlebar-stripe-cap platinum-titlebar-stripe-cap-right" />
    </span>
  );
}

export function PlatinumTitlebarLayout({ children, className = "" }) {
  return (
    <span className={`platinum-titlebar-layout${className ? ` ${className}` : ""}`}>
      <PlatinumStripeSet side="left" />
      {children}
      <PlatinumStripeSet side="right" />
    </span>
  );
}
