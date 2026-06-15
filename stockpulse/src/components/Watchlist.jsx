import { useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useInvestor } from '../context/InvestorContext';
import { stocks } from '../data/mockData';
import PriceChart from './PriceChart';

function SortableStock({ stock, price }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stock.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`watchlist-item ${isDragging ? 'dragging' : ''}`}>
      <button className="drag-handle" {...attributes} {...listeners}>⠿</button>
      <div className="watchlist-info">
        <span className="watchlist-symbol">{stock.id}</span>
        <span className="watchlist-name">{stock.name}</span>
      </div>
      <PriceChart stockId={stock.id} basePrice={price} />
      <span className="watchlist-price">${price.toFixed(2)}</span>
    </div>
  );
}

function Watchlist() {
  const { watchlist, reorderWatchlist, stockPrices } = useInvestor();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const watchlistStocks = useMemo(() => {
    return watchlist.map(id => stocks.find(s => s.id === id)).filter(Boolean);
  }, [watchlist]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = watchlist.indexOf(active.id);
      const newIndex = watchlist.indexOf(over.id);
      reorderWatchlist(arrayMove(watchlist, oldIndex, newIndex));
    }
  };

  return (
    <div className="card">
      <h2 className="section-title">Custom Watchlist Organizer</h2>
      <p className="card-hint">Drag the handles to reorder your favorite stocks</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={watchlist} strategy={verticalListSortingStrategy}>
          <div className="watchlist">
            {watchlistStocks.map(stock => (
              <SortableStock key={stock.id} stock={stock} price={stockPrices[stock.id]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default Watchlist;
