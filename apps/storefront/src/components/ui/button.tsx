import type { ButtonHTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-foreground hover:opacity-90",
        accent: "bg-accent text-accent-foreground hover:opacity-90",
        outline: "border border-line bg-surface text-ink hover:bg-canvas",
        ghost: "text-ink hover:bg-canvas",
      },
    },
    defaultVariants: { variant: "primary" },
  }
)

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  )
}
