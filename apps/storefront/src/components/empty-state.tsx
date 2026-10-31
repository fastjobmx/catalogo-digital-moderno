import { SearchX, ShoppingBag } from "lucide-react"

const icons = { search: SearchX, cart: ShoppingBag }

type Props = {
  kind: keyof typeof icons
  title: string
  description: string
}

export function EmptyState({ kind, title, description }: Props) {
  const Icon = icons[kind]
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-9" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>
    </div>
  )
}
