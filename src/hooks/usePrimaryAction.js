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
