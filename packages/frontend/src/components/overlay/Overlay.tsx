import { FC, ReactNode } from "react";
import { Dialog, Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Markdown from "../common/Markdown";
import "./Overlay.css";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  content?: string;
  children?: ReactNode;
}

export const Overlay: FC<OverlayProps> = ({ open, onClose, content, children }) => {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="overlay-modal" aria-describedby="overlay-modal-description">
      <Box sx={{ p: 3 }} className="overlay">
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>

        {content && (
          <Box>
            <Markdown content={content} />
          </Box>
        )}

        {children && <Box sx={{ mt: content ? 4 : 2 }}>{children}</Box>}
      </Box>
    </Dialog>
  );
};
