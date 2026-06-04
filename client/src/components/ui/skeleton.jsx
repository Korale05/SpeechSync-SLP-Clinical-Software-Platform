import React from 'react'

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800 ${className}`}
      {...props}
    />
  )
}

export default Skeleton;
