import { type ReactNode, useEffect, useRef } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { clsx } from 'clsx'

interface ConfirmationDialogProps {
  trigger: ReactNode
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmationDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'info',
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const openDialog = () => dialogRef.current?.showModal()
  const closeDialog = () => dialogRef.current?.close()

  useEffect(() => {
    const dialog = dialogRef.current
    const handleClickOutside = (e: MouseEvent) => {
      if (e.target === dialog) closeDialog()
    }
    dialog?.addEventListener('click', handleClickOutside)
    return () => dialog?.removeEventListener('click', handleClickOutside)
  }, [])

  const handleConfirm = () => {
    onConfirm()
    closeDialog()
  }

  const variantStyles = {
    danger: {
      icon: 'text-rose-600 bg-rose-50',
      button: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    warning: {
      icon: 'text-amber-600 bg-amber-50',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: 'text-brand bg-brand/10',
      button: 'bg-brand hover:bg-brand-dark text-white',
    },
  }[variant]

  return (
    <>
      <div onClick={openDialog} className="inline-block cursor-pointer">
        {trigger}
      </div>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm rounded-[28px] border-none p-0 shadow-2xl animate-in fade-in zoom-in duration-200 max-w-md w-[90%] outline-none"
      >
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div className={clsx('flex h-14 w-14 items-center justify-center rounded-2xl mb-6', variantStyles.icon)}>
              <AlertCircle size={28} />
            </div>
            <button
              onClick={closeDialog}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <h3 className="font-display text-2xl font-bold text-slate-900">{title}</h3>
          <p className="mt-3 text-slate-500 leading-relaxed">{description}</p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={closeDialog}
              className="flex-1 px-6 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all active:scale-95"
            >
              {cancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              className={clsx(
                'flex-1 px-6 py-3 rounded-2xl font-semibold shadow-sm transition-all active:scale-95',
                variantStyles.button
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
