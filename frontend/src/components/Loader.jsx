// Centred loading spinner used while data is being fetched.
export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="loader">
      <div className="loader-spin" />
      <span>{label}</span>
    </div>
  );
}
