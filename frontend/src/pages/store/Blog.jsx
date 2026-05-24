// Static blog page — mirrors the iceberg.pk site structure. Swap these
// placeholders for a CMS or a database-backed blog when needed.
const POSTS = [
  {
    title: 'How we hand-churn every batch',
    date: 'May 2026',
    excerpt:
      'A look inside the Nishani kitchen, from fresh cream to the final scoop — and why slow churning makes all the difference.',
  },
  {
    title: 'Kulfi season is here',
    date: 'April 2026',
    excerpt:
      'Our traditional kulfi range is back. Pista, khoya, badam zafran and more — the desi flavours you grew up with.',
  },
  {
    title: 'Five sorbets to beat the heat',
    date: 'March 2026',
    excerpt:
      'Dairy-free and bursting with fruit — meet the sorbets our customers reach for all summer long.',
  },
];

export default function Blog() {
  return (
    <div className="container section">
      <h1 className="section-title">From the Nishani blog</h1>
      <div className="blog-grid">
        {POSTS.map((post) => (
          <article className="blog-card" key={post.title}>
            <div className="blog-card-media">📰</div>
            <div className="blog-card-body">
              <span className="muted">{post.date}</span>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
