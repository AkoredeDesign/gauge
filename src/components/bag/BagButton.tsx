"use client";

import type { HTMLAttributes } from "react";
import { selectItemCount, useCartStore } from "@/lib/store/useCartStore";
import { useBagDrawer } from "@/lib/store/useBagDrawer";

type Props = HTMLAttributes<HTMLButtonElement> & {
  /** Header: "Bag [n]". Footer: just "Bag". */
  countClassName?: string;
};

/**
 * Opens the bag drawer. The count reads 0 on the server and on the first client
 * render (the cart store skips hydration), then the stored count once BagDrawer
 * has rehydrated the store, so the two renders always agree.
 */
export default function BagButton({ countClassName, ...rest }: Props) {
  const count = useCartStore(selectItemCount);
  const open = useBagDrawer((s) => s.open);
  const openBag = useBagDrawer((s) => s.openBag);
  const counted = countClassName !== undefined;

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-controls="bag"
      aria-expanded={open}
      aria-label={counted ? `Bag, ${count} ${count === 1 ? "item" : "items"}` : undefined}
      onClick={(e) => openBag(e.currentTarget)}
      {...rest}
    >
      Bag{counted && <span className={countClassName}>[{count}]</span>}
    </button>
  );
}
