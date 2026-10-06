/**
 * Page scroll lock, shared by every overlay (same pattern as KESTREL).
 *
 * The phone menu and, later, the bag drawer each have their own open state, so
 * neither can safely decide on its own that the page is scrollable again. A set
 * of who is currently holding the lock answers that once, for all of them.
 * `.scroll-locked` in globals.css only answers whether anyone is.
 */
const owners = new Set<string>();

export function setScrollLock(owner: string, locked: boolean) {
  if (locked) owners.add(owner);
  else owners.delete(owner);

  document.documentElement.classList.toggle("scroll-locked", owners.size > 0);
}
