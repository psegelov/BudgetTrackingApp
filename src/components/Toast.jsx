function Toast({ toasts }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-50 flex flex-col gap-2 items-center md:items-end">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="px-4 py-3 rounded-lg text-sm font-medium text-white whitespace-nowrap"
          style={{
            background: toast.type === 'error' ? 'var(--red)' :
                        toast.type === 'warning' ? 'var(--amber)' :
                        'var(--primary)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export default Toast