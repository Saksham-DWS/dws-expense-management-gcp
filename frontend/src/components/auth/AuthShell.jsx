const AuthShell = ({ helperCard, children, footer }) => {
  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden flex flex-col items-center justify-center px-4 py-10 gap-6">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-neutral-100" />
        <div className="absolute -left-24 top-6 h-72 w-72 rounded-full bg-black/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-black/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-6xl mx-auto rounded-[32px] border border-white/50 bg-white/80 shadow-[0_25px_70px_rgba(15,23,42,0.15)] backdrop-blur-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-[32px]">
          <div className="relative bg-black text-white p-8 md:p-10 lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.18),transparent_40%)]" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              {helperCard}
              <div className="text-xs uppercase tracking-[0.3em] text-white/80">
                Expense Management Ecosystem
              </div>
            </div>
          </div>
          <div className="bg-white px-6 py-10 md:px-10 lg:px-12 flex flex-col justify-center">{children}</div>
        </div>
      </div>

      {footer && (
        <div className="relative text-center text-sm text-slate-500 px-4">
          {footer}
        </div>
      )}
    </div>
  );
};

export default AuthShell;
