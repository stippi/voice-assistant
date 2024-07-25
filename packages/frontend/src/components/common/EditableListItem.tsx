import React, { useEffect, useState, forwardRef } from "react";
import { Checkbox, ListItem, ListItemIcon, ListItemText, IconButton, Input, ListItemButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DoneIcon from "@mui/icons-material/Done";
import EditIcon from "@mui/icons-material/Edit";
import { IoDuplicate } from "react-icons/io5";

interface Item {
  id: string;
  name: string;
}

interface ItemProps {
  item: Item;
  fallbackName: string;
  onClick: () => void;
  onRename: (newName: string) => void;
  onDuplicate?: () => void;
  onDelete: () => void;
  isSelected: boolean;
  onActivate?: () => void;
  isActive?: boolean;
}

const EditableListItem = forwardRef<HTMLLIElement, ItemProps & React.HTMLAttributes<HTMLLIElement>>(
  (
    { item, fallbackName, onClick, onRename, onDuplicate, onDelete, isSelected, onActivate, isActive, ...props },
    ref,
  ) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentName, setCurrentName] = useState(item.name);
    const [hovered, setHovered] = useState(false);
    const onMouseEnter = () => {
      setHovered(true);
    };
    const onMouseLeave = () => {
      setHovered(false);
    };

    useEffect(() => {
      if (!isSelected) {
        setIsEditing(false);
      }
    }, [isSelected]);

    const doneRenaming = () => {
      onRename(currentName);
      setIsEditing(false);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        doneRenaming();
      }
    };

    return (
      <ListItem
        ref={ref}
        disablePadding
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        secondaryAction={
          isEditing ? (
            <IconButton edge="end" aria-label="done" size="small" onClick={doneRenaming}>
              <DoneIcon fontSize="inherit" />
            </IconButton>
          ) : isSelected ? (
            <div
              style={{
                opacity: hovered ? 1 : 0,
                transition: "opacity 0.2s ease-in-out",
                backgroundColor: "inherit",
              }}
            >
              <IconButton edge="end" aria-label="rename" size="small" onClick={() => setIsEditing(true)}>
                <EditIcon fontSize="inherit" />
              </IconButton>
              {onDuplicate && (
                <IconButton edge="end" aria-label="duplicate" size="small" onClick={onDuplicate}>
                  <IoDuplicate fontSize="inherit" />
                </IconButton>
              )}
              <IconButton
                edge="end"
                aria-label="delete"
                size="small"
                onClick={onDelete}
                style={{
                  opacity: hovered ? 1 : 0,
                  transition: "opacity 0.2s ease-in-out",
                }}
              >
                <DeleteIcon fontSize="inherit" />
              </IconButton>
            </div>
          ) : (
            <></>
          )
        }
        {...props}
      >
        {isEditing ? (
          <Input
            value={currentName}
            onChange={(e) => setCurrentName(e.target.value)}
            autoFocus
            fullWidth
            onKeyDown={onKeyDown}
            sx={{
              paddingLeft: "1rem",
              paddingRight: "1rem",
            }}
          />
        ) : (
          <ListItemButton disableRipple selected={isSelected} onClick={onClick}>
            {onActivate && (
              <ListItemIcon sx={{ minWidth: 0 }}>
                <Checkbox
                  edge="start"
                  checked={isActive}
                  onClick={onActivate}
                  tabIndex={-1}
                  disableRipple
                  sx={{ paddingX: "0.75rem", paddingY: 0 }}
                />
              </ListItemIcon>
            )}
            <ListItemText
              id={item.id}
              primary={item.name || fallbackName}
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: "medium",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            />
          </ListItemButton>
        )}
      </ListItem>
    );
  },
);

export default EditableListItem;
