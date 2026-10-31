import type { ButtonHTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-bold transition-all duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-70",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-foreground hover:opacity-90",
        accent: "bg-accent text-accent-foreground hover:opacity-90",
        outline: "border border-line bg-surface text-ink hover:bg-canvas",
        ghost: "text-ink hover:bg-canvas",
        whatsapp: "bg-whatsapp text-white hover:opacity-90",
      },
      size: {
        default: "",
        small: "min-h-9 rounded-full px-3 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
)

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
