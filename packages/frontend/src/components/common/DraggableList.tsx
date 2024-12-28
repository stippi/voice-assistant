import { ReactElement } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import DraggableListItem from "./DraggableListItem";

export type DraggableItemProps = {
  id: string;
  index: number;
};

type DraggableListProps<T extends DraggableItemProps> = {
  items: T[];
  onReorder: (oldIndex: number, newIndex: number) => void;
  renderItem: (item: T) => ReactElement;
};

export function DraggableList<T extends DraggableItemProps>({
  items,
  onReorder,
  renderItem,
}: DraggableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      onReorder(oldIndex, newIndex);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <DraggableListItem key={item.id} id={item.id}>
            {renderItem(item)}
          </DraggableListItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
