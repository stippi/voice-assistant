import { FC, useEffect, useState } from "react";
import { Overlay } from "./Overlay";
import { overlayService, type Overlay as OverlayType } from "../../services/OverlayService";

export const ChatOverlay: FC = () => {
  const [overlay, setOverlay] = useState<OverlayType | null>(() => overlayService.getOverlay());

  useEffect(() => {
    setOverlay(overlayService.getOverlay());

    const handleOverlayOpened = (newOverlay: OverlayType) => {
      setOverlay(newOverlay);
    };

    const handleOverlayClosed = () => {
      setOverlay(null);
    };

    overlayService.on("overlayOpened", handleOverlayOpened);
    overlayService.on("overlayClosed", handleOverlayClosed);

    return () => {
      overlayService.off("overlayOpened", handleOverlayOpened);
      overlayService.off("overlayClosed", handleOverlayClosed);
    };
  }, []);

  if (!overlay) {
    return null;
  }

  return <Overlay open={true} onClose={() => overlayService.closeOverlay()} content={overlay.contents} />;
};
