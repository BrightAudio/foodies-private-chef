export default function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };
  return (
    <span className={`${sizeClasses[size]} inline-flex items-center`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= Math.round(rating) ? "text-gold" : "text-dark-border"}>
          ★
        </span>
      ))}
    </span>
  );
}
