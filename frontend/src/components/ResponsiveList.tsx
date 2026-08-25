import type { ReactNode } from 'react'

type ResponsiveListProps = {
  desktop: ReactNode
  mobile: ReactNode
  className?: string
}

export default function ResponsiveList({ desktop, mobile, className = '' }: ResponsiveListProps) {
  return (
    <div className={className}>
      <div className="admin-only-desktop">{desktop}</div>
      <div className="admin-only-mobile">{mobile}</div>
    </div>
  )
}
