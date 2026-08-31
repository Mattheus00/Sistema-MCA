import type { ReactNode } from 'react'

export type AdminItemCardField = {
  label: string
  value: ReactNode
}

type AdminItemCardProps = {
  title: ReactNode
  meta?: ReactNode
  value?: ReactNode
  fields?: AdminItemCardField[]
  actions?: ReactNode
  className?: string
  onClick?: () => void
}

export default function AdminItemCard({
  title,
  meta,
  value,
  fields,
  actions,
  className = '',
  onClick,
}: AdminItemCardProps) {
  return (
    <article
      className={`admin-item-card ${onClick ? 'admin-item-card--clickable' : ''} ${className}`.trim()}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="admin-item-card__top">
        <div className="admin-item-card__titulo-wrap">
          <h3 className="admin-item-card__titulo">{title}</h3>
          {meta && <p className="admin-item-card__meta-linha">{meta}</p>}
        </div>
        {value != null && value !== '' && (
          <p className="admin-item-card__valor">{value}</p>
        )}
      </div>
      {fields && fields.length > 0 && (
        <dl className="admin-item-card__grid">
          {fields.map((field) => (
            <div key={field.label} className="admin-item-card__grid-item">
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && <div className="admin-item-card__acoes">{actions}</div>}
    </article>
  )
}
