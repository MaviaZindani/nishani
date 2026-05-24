// Renders an uploaded image, or a friendly placeholder when none exists.
export default function ProductImage({ src, alt = '', className = '' }) {
  if (!src) {
    return (
      <div className={`img-placeholder ${className}`} aria-label={alt}>
        <span>🍦</span>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}
