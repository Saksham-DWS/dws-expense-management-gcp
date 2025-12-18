const Loading = ({ size = 'md', fullScreen = false, label = 'Loading data' }) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const spinner = (
    <div className="flex flex-col items-center space-y-3">
      <div className={`relative ${sizes[size]}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black via-black to-neutral-800 animate-spin blur-[1px] opacity-70"></div>
        <div className="absolute inset-1 rounded-full bg-white/90"></div>
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return <div className="flex justify-center items-center py-10">{spinner}</div>;
};

export default Loading;
