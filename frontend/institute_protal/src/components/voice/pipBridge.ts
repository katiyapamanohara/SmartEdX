/**
 * pipBridge — tiny module-level singleton that lets a button-click handler
 * (which has a user gesture) open a Document PiP window BEFORE the VoiceModal
 * mounts, so VoiceModal can pick it up and render straight into it without
 * needing a second user interaction.
 *
 * Usage:
 *   // in button click handler (user gesture context):
 *   await openPipWindowForNextSession();
 *
 *   // in VoiceModal forcePip useEffect:
 *   const win = takePipWindow();
 *   if (win) { setSysPipWindow(win); }
 */

let _pending: Window | null = null;

/**
 * Try to open a Document PiP window.  Must be called within a user gesture.
 * Silently does nothing if the API is unsupported or the user cancels.
 */
export async function openPipWindowForNextSession(): Promise<void> {
  const docPip = (window as any).documentPictureInPicture;
  if (!docPip) return;
  try {
    const pip: Window = await docPip.requestWindow({ width: 216, height: 320 });

    // Inject minimal styles so the portal renders correctly
    const style = pip.document.createElement("style");
    style.textContent = [
      "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
      "body { overflow: hidden; background: transparent; }",
      "@keyframes spin  { to { transform: rotate(360deg); } }",
      "@keyframes pulse { 0%,100%{ opacity:1; } 50%{ opacity:.4; } }",
    ].join("\n");
    pip.document.head.appendChild(style);

    _pending = pip;
  } catch {
    // user cancelled or browser blocked — fall back to in-browser PiP
  }
}

/** Consume the pre-opened PiP window (clears the stored reference). */
export function takePipWindow(): Window | null {
  const win = _pending;
  _pending = null;
  return win;
}

/** Peek without consuming (e.g. to check if one is waiting). */
export function hasPendingPipWindow(): boolean {
  return _pending !== null && !_pending.closed;
}
