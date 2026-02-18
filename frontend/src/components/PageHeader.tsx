interface PageHeaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: string;
}

export function PageHeader({ title, description, icon, badge }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden border-b border-gray-800/50 bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        {badge && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-semibold uppercase tracking-wider mb-4">
            <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
            {badge}
          </div>
        )}
        <div className="flex items-center gap-3 mb-3">
          {icon && <span className="text-3xl leading-none">{icon}</span>}
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{title}</h1>
        </div>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
