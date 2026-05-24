import { useState } from 'react';

const FAQS = [
  {
    q: 'How long does delivery take?',
    a: 'Orders typically arrive within 40–45 minutes. Timing may vary by area and can be longer during peak hours.',
  },
  {
    q: 'How much is delivery?',
    a: 'Delivery charges depend on your area. The exact charge is shown at checkout once you select your delivery area.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All orders are Cash on Delivery — simply pay the rider when your order arrives.',
  },
  {
    q: 'Can I get a refund or exchange?',
    a: 'Consumed food cannot be exchanged or refunded. If there is a genuine complaint, the rider will collect the item and a refund or exchange is processed based on the feedback.',
  },
  {
    q: 'How do I track my order?',
    a: 'Every order gets a unique order number. Enter it on the Track Order page to see its live status.',
  },
  {
    q: 'How do I make a complaint?',
    a: 'Call us at 021-35213967 with your order number and our team will help you right away.',
  },
];

export default function Faqs() {
  const [open, setOpen] = useState(0);
  return (
    <div className="container section section-narrow">
      <h1 className="section-title">Frequently asked questions</h1>
      <div className="faq-list">
        {FAQS.map((item, i) => (
          <div className={`faq-item ${open === i ? 'open' : ''}`} key={item.q}>
            <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
              <span>{item.q}</span>
              <span className="faq-toggle">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p className="faq-a">{item.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
