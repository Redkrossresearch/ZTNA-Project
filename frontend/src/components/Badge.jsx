import React from 'react';

const Badge = ({ value }) => {
  if (!value) return null;
  return <span className={`badge badge-${value}`}>{value}</span>;
};

export default Badge;
