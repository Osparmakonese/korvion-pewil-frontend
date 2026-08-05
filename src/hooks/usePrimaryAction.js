import { useEffect, useRef } from 'react';

/**
 * Wire a page to the primary action button in the top bar.
 *
 * The header button (App.js -> Layout -> Topbar) dispatches a
 * `pewil-primary-action` CustomEvent. Historically only Products.js and
 * Suppliers.js ever listened for it, so 41 of the 43 header buttons in the app
 * were inert — they scrolled to top and did nothing else. No request, no error,
 * no feedback. That is what "the tax page refuses to configure while I think it
 * works" looked like from the shop floor: the prominent button in the header
 * did nothing, while the real button lower down the page worked fine.
 *
 * Usage — pass the same thing the page's own in-page button does:
 *
 *   usePrimaryAction(() => setShowModal(true));
 *   usePrimaryAction(handleSave);
 *
 * The handler is held in a ref so passing an inline arrow function does not
 * resubscribe on every render.
 */
/**
 * Scroll to the page's add/edit form and focus its first field.
 *
 * Retail pages open a modal, so their header button has something to trigger.
 * Farm pages instead render an always-visible inline <form> — there is no
 * modal, so "+ Add worker" had nothing to open and did nothing at all. Jumping
 * to the form and focusing it is the useful equivalent, and it helps most on a
 * phone where the form is often below the fold.
 */
export function focusFirstForm() {
  const form = document.querySelector('main form') || document.querySelector('form');
  if (!form) return false;
  try {
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (_) {
    form.scrollIntoView();
  }
  const field = form.querySelector(
    'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
  );
  // Wait for the smooth scroll before focusing, or the browser jumps twice.
  if (field) setTimeout(() => { try { field.focus(); } catch (_) {} }, 320);
  return true;
}

export default function usePrimaryAction(handler) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const onEvent = () => {
      const fn = ref.current;
      if (typeof fn === 'function') fn();
    };
    window.addEventListener('pewil-primary-action', onEvent);
    return () => window.removeEventListener('pewil-primary-action', onEvent);
  }, []);
}
