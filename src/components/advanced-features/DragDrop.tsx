import React, { createContext, useContext, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

interface DragItem {
    id: string;
    index: number;
}

interface DragDropContextValue {
    draggedItem: DragItem | null;
    setDraggedItem: (item: DragItem | null) => void;
    dropTargetIndex: number | null;
    setDropTargetIndex: (index: number | null) => void;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

export const DragDropProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

    return (
        <DragDropContext.Provider value={{ draggedItem, setDraggedItem, dropTargetIndex, setDropTargetIndex }}>
            {children}
        </DragDropContext.Provider>
    );
};

interface DraggableItemProps {
    id: string;
    index: number;
    children: React.ReactNode;
    onReorder: (fromIndex: number, toIndex: number) => void;
    className?: string;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
    id,
    index,
    children,
    onReorder,
    className = ''
}) => {
    const context = useContext(DragDropContext);
    const [isDragging, setIsDragging] = useState(false);
    const [isOver, setIsOver] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    if (!context) {
        throw new Error('DraggableItem must be used within DragDropProvider');
    }

    const { draggedItem, setDraggedItem, setDropTargetIndex } = context;

    const handleDragStart = (event: React.DragEvent) => {
        setIsDragging(true);
        setDraggedItem({ id, index });
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDraggedItem(null);
        setDropTargetIndex(null);
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        if (draggedItem && draggedItem.index !== index) {
            setIsOver(true);
            setDropTargetIndex(index);
        }
    };

    const handleDragLeave = () => {
        setIsOver(false);
    };

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();
        setIsOver(false);

        if (draggedItem && draggedItem.index !== index) {
            onReorder(draggedItem.index, index);
        }
    };

    const handleTouchStart = () => {
        setIsDragging(true);
        setDraggedItem({ id, index });
    };

    const handleTouchMove = (event: React.TouchEvent) => {
        if (!isDragging) return;

        const touch = event.touches[0];
        const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
        const target = elements.find(element => element.getAttribute('data-draggable') === 'true');

        if (target) {
            const targetIndex = parseInt(target.getAttribute('data-index') || '0', 10);
            if (targetIndex !== index) {
                setDropTargetIndex(targetIndex);
            }
        }
    };

    const handleTouchEnd = () => {
        if (context.dropTargetIndex !== null && context.dropTargetIndex !== index) {
            onReorder(index, context.dropTargetIndex);
        }
        setIsDragging(false);
        setDraggedItem(null);
        setDropTargetIndex(null);
    };

    return (
        <div
            ref={elementRef}
            draggable
            data-draggable="true"
            data-index={index}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`
                relative group cursor-move
                transition-all duration-200
                ${isDragging ? 'opacity-50 scale-95' : ''}
                ${isOver ? 'border-t-2 border-indigo-500' : ''}
                ${className}
            `}
        >
            <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                <GripVertical className="h-4 w-4 text-slate-400" />
            </div>
            {children}
        </div>
    );
};
