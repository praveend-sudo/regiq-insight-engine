export function RegIQLogo({
  onDark = false,
  size = "md",
}: {
  onDark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const cls =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";
  const base = onDark ? "text-white" : "text-[color:var(--brand-indigo)]";
  return (
    <span className={`font-black tracking-tight ${cls} ${base}`}>
      Reg<span className="text-[color:var(--brand-cyan)]">IQ</span>
    </span>
  );
}
