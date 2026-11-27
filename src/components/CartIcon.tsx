import { createLucideIcon } from 'lucide-react';

/**
 * Lucide's shopping cart with the wheels tucked up under the basket (its own
 * leaves a wide gap between them). Same stroke and sizing as the other icons.
 */
const CartIcon = createLucideIcon('cart', [
  ['path', { d: 'M2.05 3.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12', key: 'body' }],
  ['circle', { cx: '8.5', cy: '20.25', r: '1.25', key: 'wheel-back' }],
  ['circle', { cx: '18', cy: '20.25', r: '1.25', key: 'wheel-front' }],
]);

export default CartIcon;
