"use client";

export default function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-3xl transition-colors ${star <= value ? "text-gold" : "text-dark-border"} hover:text-gold-light`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
