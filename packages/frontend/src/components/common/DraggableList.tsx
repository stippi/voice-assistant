import { ReactElement } from "react";
import DraggableListItem, { DraggableItemProps } from "./DraggableListItem";
import {
  DraggableProvided,
  DraggableStateSnapshot,
  DragDropContext,
  Droppable,
  OnDragEndResponder,
} from "react-beautiful-dnd";
import { List } from "@mui/material";

export type { OnDragEndResponder } from "react-beautiful-dnd";

type DraggableListProps<T extends DraggableItemProps> = {
  items: T[];
  onDragEnd: OnDragEndResponder;
  renderItem: (provided: DraggableProvided, snapshot: DraggableStateSnapshot, item: T) => ReactElement;
};

export function DraggableList<T extends DraggableItemProps>({ items, onDragEnd, renderItem }: DraggableListProps<T>) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="droppable-list">
        {(provided) => (
          <List ref={provided.innerRef} {...provided.droppableProps}>
            {items.map((item, index) => (
              <DraggableListItem key={item.id} item={{ ...item, index }}>
                {renderItem}
              </DraggableListItem>
            ))}
            {provided.placeholder}
          </List>
        )}
      </Droppable>
    </DragDropContext>
  );
}
