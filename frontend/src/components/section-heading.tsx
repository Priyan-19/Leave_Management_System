import type { PropsWithChildren, ReactNode } from 'react'

interface SectionHeadingProps extends PropsWithChildren {
  title: string
  description: string
  action?: ReactNode
}

export function SectionHeading({ title, description, action, children }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">Workspace</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        {children}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
