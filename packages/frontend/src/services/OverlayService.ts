import { EventEmitter, EventMap } from "./EventEmitter";

export type Overlay = {
  contents: string;
};

interface OverlayServiceEvents extends EventMap {
  overlayOpened: [Overlay];
  overlayClosed: [];
}

export class OverlayService extends EventEmitter<OverlayServiceEvents> {
  private overlay: Overlay | null = null;
  constructor() {
    super();
  }

  getOverlay(): Overlay | null {
    return this.overlay;
  }

  openOverlay(overlay: Overlay) {
    if (this.overlay === overlay) return;
    this.closeOverlay();
    this.overlay = overlay;
    this.emit("overlayOpened", overlay);
  }

  closeOverlay() {
    if (this.overlay === null) return;
    this.overlay = null;
    this.emit("overlayClosed");
  }
}

export const overlayService = new OverlayService();
