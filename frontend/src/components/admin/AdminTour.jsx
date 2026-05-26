import { useEffect, useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { useAuth } from '../../context/AuthContext.jsx';

// Role-specific tour steps. Each `target` is a CSS selector that must
// resolve to an element on the page once that step is reached. The
// `data-tour="…"` attributes are declared on the matching JSX nodes in
// AdminLayout.jsx and pages/admin/Dashboard.jsx.
const TOURS = {
  SUPER_ADMIN: [
    {
      target: '[data-tour="sidebar"]',
      title: 'Welcome to Nishani',
      content:
        'This sidebar is your home base. Every section of the portal — orders, products, branches, reports — lives in here.',
      placement: 'right',
    },
    {
      target: '[data-tour="dashboard-income"]',
      title: 'Income at a glance',
      content:
        'Each dashboard card summarises a key number. This one is the revenue collected from closed orders this month.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="nav-orders"]',
      title: 'Orders',
      content:
        'See incoming, accepted, and dispatched orders across every branch — and step in if a handler needs help.',
      placement: 'right',
    },
    {
      target: '[data-tour="nav-branches"]',
      title: 'Branches',
      content:
        'Add and configure your physical locations. Each branch carries coordinates so customers see accurate live ETAs.',
      placement: 'right',
    },
  ],
  ORDER_HANDLER: [
    {
      target: '[data-tour="sidebar"]',
      title: 'Your workspace',
      content: 'Navigate the Orders screen and your delivery areas from this sidebar.',
      placement: 'right',
    },
    {
      target: '[data-tour="nav-orders"]',
      title: 'The live order feed',
      content:
        'New customer orders for your branch arrive here in real time. Click "Pick this order" to claim — once you do, no other handler can take it.',
      placement: 'right',
    },
    {
      target: '[data-tour="branch-toggle"]',
      title: 'Open or close your branch',
      content:
        'Use this toggle to start or stop accepting orders. When you sign out, your branch closes automatically.',
      placement: 'bottom',
      // A pill-shaped button looks best with a generous corner radius — feels like a circle.
      spotlightRadius: 999,
    },
  ],
  PRODUCT_MANAGER: [
    {
      target: '[data-tour="sidebar"]',
      title: 'Your workspace',
      content:
        'You manage the menu from this sidebar — Products, Categories, and Offers.',
      placement: 'right',
    },
    {
      target: '[data-tour="nav-products"]',
      title: 'Products',
      content:
        'Add new items, edit prices and descriptions, or mark anything out of stock with one click.',
      placement: 'right',
    },
    {
      target: '[data-tour="nav-offers"]',
      title: 'Offers',
      content:
        'Upload promotional images or short videos shown on the storefront\'s home page.',
      placement: 'right',
    },
  ],
};

// v3 styles map — note `buttonPrimary` (v3) replaces the old `buttonNext` from v2.
const STYLES = {
  tooltip: {
    borderRadius: 14,
    padding: 22,
    boxShadow: '0 18px 50px rgba(20, 12, 25, 0.28)',
    fontSize: '0.94rem',
    maxWidth: 360,
  },
  tooltipTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: 8,
    color: '#2a2438',
  },
  tooltipContent: {
    padding: 0,
    color: '#5b5666',
    lineHeight: 1.55,
    textAlign: 'left',
  },
  buttonPrimary: {
    backgroundColor: '#e23e6d',
    borderRadius: 8,
    padding: '8px 18px',
    fontWeight: 600,
    fontSize: '0.88rem',
    color: '#fff',
  },
  buttonBack: {
    color: '#8a8595',
    fontSize: '0.88rem',
    marginRight: 8,
  },
  buttonSkip: {
    color: '#8a8595',
    fontSize: '0.85rem',
  },
};

const LOCALE = {
  back: '← Back',
  close: 'Close',
  last: 'Got it',
  next: 'Next →',
  skip: 'Skip tour',
};

// Starts the spotlight tour once the role-appropriate step targets are
// likely mounted. Calls `onFinish` when the user completes or skips.
export default function AdminTour({ onFinish }) {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const steps = TOURS[user?.role] || TOURS.ORDER_HANDLER;

  // Wait briefly so dashboard cards that load after a fetch (income, etc.)
  // are in the DOM by the time Joyride looks for their data-tour targets.
  useEffect(() => {
    const t = setTimeout(() => setRun(true), 900);
    return () => clearTimeout(t);
  }, []);

  function handleEvent(data) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRun(false);
      onFinish();
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleEvent}
      styles={STYLES}
      locale={LOCALE}
      // v3 puts behaviour + theming knobs into one `options` bag.
      options={{
        showProgress: true,
        skipBeacon: true,
        buttons: ['back', 'primary', 'skip'], // omit 'close'
        overlayClickAction: false, // clicking the backdrop won't dismiss
        spotlightPadding: 8,
        spotlightRadius: 12, // soft rounded-rectangle knockout
        overlayColor: 'rgba(0, 0, 0, 0.8)', // 80 % black backdrop
        primaryColor: '#e23e6d',
        backgroundColor: '#fff',
        arrowColor: '#fff',
        textColor: '#2a2438',
        zIndex: 10000,
      }}
    />
  );
}
