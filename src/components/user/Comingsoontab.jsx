'use client';

export default function ComingSoonTab({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/15 to-red-600/15 border border-orange-500/20 flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-orange-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-display font-black text-white mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground/60 max-w-sm">{description}</p>
    </div>
  );
}