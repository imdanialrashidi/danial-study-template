/**
 * Island import path for the progress seam.
 *
 * Re-exported from the progress module so island call sites keep one stable
 * import while the subscription rule and store live behind one interface.
 */
export { ProgressBridge, subscribeProgress } from '../../lib/progress';
