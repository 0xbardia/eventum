type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
};

export function BrandMark({ size = "md" }: BrandMarkProps) {
  return (
    <svg className={`brand-symbol brand-symbol-${size}`} viewBox="0 0 48 32" aria-hidden="true" focusable="false">
      <path className="brand-rail" d="M2 5h13l10 11" />
      <path className="brand-rail" d="M2 27h13l10-11" />
      <path className="brand-edge" d="M25 16h21" />
      <path className="brand-node" d="m21.5 16 3.5-3.5 3.5 3.5-3.5 3.5Z" />
    </svg>
  );
}
