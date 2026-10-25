/** One label for every form: a visible * after required fields, "(optional)" in soft grey after optional ones. The input itself still carries required / aria-required. */
export function Label({ htmlFor, req, opt, className, children }: { htmlFor: string; req?: boolean; opt?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={className}>
      {children}
      {req ? <span className="req" aria-hidden="true">*</span> : null}
      {opt ? <span className="opt"> (optional)</span> : null}
    </label>
  )
}

/** The small grey "* Required" line at the top of a form that has required fields. */
export function ReqNote({ style }: { style?: React.CSSProperties }) {
  return <p className="req-note" style={style}>* Required</p>
}
