/** sessionStorage key: Zero-set plays once per tab session. */
export const ZERO_SET_KEY = "gauge:zeroset";

/** Window event fired as the sign-off tick starts; the header's index marker clamps in on it. */
export const ZERO_SET_SIGNOFF = "gauge:zeroset-signoff";

/**
 * Runs in <head> before first paint. Flags the document so the hero renders in
 * its pre-calibration state instead of flashing the final values and jumping.
 * Skipped (final state renders as-is) for reduced motion, a repeat visit this
 * session, or any page but home. Failsafe: if the animation never claims the
 * flag, it is dropped so nothing stays hidden.
 */
export const zeroSetScript = `try{var d=document.documentElement;if(location.pathname==="/"&&!sessionStorage.getItem("${ZERO_SET_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.dataset.zeroset="pending";setTimeout(function(){if(d.dataset.zeroset==="pending")delete d.dataset.zeroset},4000)}}catch(e){}`;
