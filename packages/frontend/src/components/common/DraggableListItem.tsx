import { ReactElement } from "react";
import { Draggable, DraggableProvided, DraggableStateSnapshot } from "react-beautiful-dnd";

export type DraggableItemProps = {
  id: string;
  index: number;
};

type Props<T extends DraggableItemProps> = {
  item: T;
  children: (provided: DraggableProvided, snapshot: DraggableStateSnapshot, item: T) => ReactElement;
};

const DraggableListItem = <T extends DraggableItemProps>({ item, children }: Props<T>) => {
  return (
    <Draggable draggableId={item.id} index={item.index}>
      {(provided, snapshot) => children(provided, snapshot, item)}
    </Draggable>
  );
};

export default DraggableListItem;
