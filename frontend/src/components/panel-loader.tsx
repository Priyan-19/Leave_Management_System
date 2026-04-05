interface PanelLoaderProps {
  label: string
}

export function PanelLoader({ label }: PanelLoaderProps) {
  return (
    <div className="glass-panel px-6 py-12 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand/15 border-t-brand" />
      <p className="mt-4 text-sm font-semibold text-slate-700">{label}</p>
    </div>
  )
}
