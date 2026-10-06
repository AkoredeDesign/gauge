import { create } from "zustand";

/**
 * Bag drawer open state, shared by everything that opens it: the header and footer
 * Bag buttons and Add to bag. Not persisted: a reload starts with it closed.
 */

type BagDrawerState = {
  open: boolean;
  /** "GAUGE-01 Field, Matte black" after Add to bag; cleared on close */
  added: string | null;
  openBag: (opener: HTMLElement | null, added?: string) => void;
  closeBag: () => void;
};

/** The control that opened the drawer, to hand focus back to. Kept out of state:
 *  it never renders anything. */
let opener: HTMLElement | null = null;
export const takeOpener = () => {
  const el = opener;
  opener = null;
  return el;
};

export const useBagDrawer = create<BagDrawerState>()((set) => ({
  open: false,
  added: null,
  openBag: (el, added) => {
    opener = el;
    set({ open: true, added: added ?? null });
  },
  closeBag: () => set({ open: false, added: null }),
}));
