import clsx from "clsx";

type BadgeTone = "gold" | "green" | "red" | "gray";

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  gold: "bg-[#F3E9D3] text-[#8A6A2E]",
  green: "bg-[#E4EBE1] text-[#4C6B4C]",
  red: "bg-[#F3E3DE] text-[#9A4A36]",
  gray: "bg-beige text-grayx",
};

export function Badge({ children, tone = "gray", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full",
        TONES[tone],
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}