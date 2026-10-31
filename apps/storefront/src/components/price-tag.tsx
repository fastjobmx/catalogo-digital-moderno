import { cn, formatMoney } from "@/lib/utils"

type Props = {
  price: number
  compareAt?: number | null
  currencyCode: string
  large?: boolean
}

export function PriceTag({ price, compareAt, currencyCode, large }: Props) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
      <span className={cn("font-bold", large ? "text-2xl" : "text-[15px]")}>
        {formatMoney(price, currencyCode)}
      </span>
      {compareAt ? (
        <s className={cn("text-muted", large ? "text-base" : "text-xs")}>
          <span className="sr-only">Antes </span>
          {formatMoney(compareAt, currencyCode)}
        </s>
      ) : null}
    </p>
  )
}
