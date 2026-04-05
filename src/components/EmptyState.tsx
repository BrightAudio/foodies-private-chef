import Link from "next/link";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon = "🍽️", title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-4xl mb-4">{icon}</p>
      <h3 className="text-lg font-semibold text-cream mb-2">{title}</h3>
      {description && <p className="text-cream-muted text-sm max-w-sm mx-auto mb-6">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-block border border-gold text-gold hover:bg-gold hover:text-dark transition-colors px-6 py-2.5 text-sm tracking-wider uppercase"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          onClick={onAction}
          className="border border-gold text-gold hover:bg-gold hover:text-dark transition-colors px-6 py-2.5 text-sm tracking-wider uppercase"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
