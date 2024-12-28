import { ReactElement } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Box } from "@mui/material";

type Props = {
  id: string;
  children: ReactElement;
};

const DraggableListItem = ({ id, children }: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        position: 'relative',
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
          opacity: 0.5,
          '&:hover': { opacity: 1 },
          transition: 'opacity 0.2s',
        }}
      >
        <DragIndicatorIcon />
      </Box>
      <Box sx={{ flex: 1, pl: '40px' }}>
        {children}
      </Box>
    </Box>
  );
};

export default DraggableListItem;
