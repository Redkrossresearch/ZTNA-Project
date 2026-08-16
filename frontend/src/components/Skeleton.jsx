import React from 'react';
import './polish.css';

/** A single skeleton table row with `columns` shimmering cells. */
const SkeletonRow = ({ columns = 4 }) => (
  <div className="skeleton-row" aria-hidden="true">
    {Array.from({ length: columns }).map((_, i) => (
      <div key={i} className="skeleton" />
    ))}
  </div>
);

/** A block of skeleton rows, for table-shaped loading states. */
const SkeletonTable = ({ rows = 5, columns = 4 }) => (
  <div role="status" aria-label="Loading data">
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonRow key={i} columns={columns} />
    ))}
    <span className="sr-only">Loading...</span>
  </div>
);

/** A shimmering placeholder the size of a stat card, for the dashboard grid. */
const SkeletonCard = () => <div className="skeleton skeleton-card" aria-hidden="true" />;

/** A grid of skeleton cards, matching .stat-grid's shape. */
const SkeletonStatGrid = ({ count = 4 }) => (
  <div className="stat-grid" role="status" aria-label="Loading statistics">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
    <span className="sr-only">Loading...</span>
  </div>
);

export { SkeletonRow, SkeletonTable, SkeletonCard, SkeletonStatGrid };
