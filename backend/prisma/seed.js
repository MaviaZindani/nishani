require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const { slugify, generateOrderNumber } = require('../src/utils/helpers');

// Categories mirror the iceberg.pk catalogue structure.
// Products are sample data with PKR prices — replace via the admin portal.
const CATALOG = [
  {
    category: 'Regular Flavour',
    products: [
      ['Vanilla', 650, { featured: true }],
      ['Chocolate Chip', 700],
      ['Strawberry Ripple', 700],
      ['Rose', 650],
      ['Mango', 700, { featured: true }],
      ['Pista', 750],
      ['Coffee', 700],
      ['Tutti Frutti', 700],
    ],
  },
  {
    category: 'Exclusive Flavour',
    products: [
      ['Cadbury Crunch', 950, { featured: true }],
      ['Vanilla Cookies & Oreo', 900],
      ['Chocolate Fudge Brownie', 1100, { featured: true }],
      ['Roasted Almond', 1000],
      ['Coffee Fudge', 950],
    ],
  },
  {
    category: 'Our Specialities',
    products: [
      ['Strawberry Cheesecake', 1200],
      ['Gateau Parfait', 1300],
      ['Cookie Crush', 1100],
      ['Dark Velvet', 1250, { featured: true }],
    ],
  },
  {
    category: 'Kulfi',
    products: [
      ['Pista Kulfi', 200],
      ['Khoya Kulfi', 220],
      ['Rose Kulfi', 200],
      ['Badam Zafran Kulfi', 250],
      ['Crunch Kulfi', 230],
    ],
  },
  {
    category: 'Seasonal Flavour',
    products: [
      ['Fresh Strawberry', 800],
      ['Chickoo', 750],
      ['Sharifa', 850, { inStock: false }],
      ['Falsa Sorbet', 700],
    ],
  },
  {
    category: 'Sorbets',
    products: [
      ['Strawberry Sorbet', 750],
      ['Pomegranate Sorbet', 800],
      ['Mango Sorbet', 750],
    ],
  },
  {
    category: 'Premium Flavours',
    products: [
      ['Pina Colada', 1200],
      ['Anjeer', 1300, { featured: true }],
      ['Kaju Rabri', 1350],
    ],
  },
  {
    category: 'Dessert',
    products: [
      ['Three Milk Cake', 1400],
      ['Red Velvet Cookie', 300],
      ['Double Chocolate Cookie', 300],
    ],
  },
];

const AREAS = [
  ['Gulshan-e-Iqbal', 120],
  ['DHA', 150],
  ['Clifton', 150],
  ['North Nazimabad', 130],
  ['Bahadurabad', 110],
  ['Malir', 180],
];

const OFFERS = [
  { title: 'Free delivery on orders above Rs. 2,500', sortOrder: 1 },
  { title: 'New scoop in town — try Chocolate Fudge Brownie', sortOrder: 2 },
];

async function main() {
  // Clear existing data so the seed is safe to re-run.
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.deliveryArea.deleteMany();
  await prisma.adminUser.deleteMany();

  // --- Admin users (one account per role) --------------------------------
  const superEmail = (process.env.ADMIN_EMAIL || 'admin@nishani.local').toLowerCase();
  const superPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminAccounts = [
    { email: superEmail, name: 'Store Owner', role: 'SUPER_ADMIN', password: superPassword },
    { email: 'orders@nishani.local', name: 'Order Handler', role: 'ORDER_HANDLER', password: 'orders123' },
    { email: 'products@nishani.local', name: 'Product Manager', role: 'PRODUCT_MANAGER', password: 'products123' },
  ];
  for (const acc of adminAccounts) {
    await prisma.adminUser.create({
      data: {
        email: acc.email,
        name: acc.name,
        role: acc.role,
        passwordHash: bcrypt.hashSync(acc.password, 10),
      },
    });
  }

  // --- Catalogue ---------------------------------------------------------
  const productByName = {};
  let sortOrder = 0;
  for (const group of CATALOG) {
    const category = await prisma.category.create({
      data: { name: group.category, slug: slugify(group.category), sortOrder: sortOrder++ },
    });
    for (const [name, price, opts = {}] of group.products) {
      const product = await prisma.product.create({
        data: {
          name,
          slug: slugify(name),
          description: `${name} — a creamy, hand-churned ${group.category.toLowerCase()} treat made fresh by Nishani.`,
          price,
          categoryId: category.id,
          featured: !!opts.featured,
          inStock: opts.inStock !== false,
        },
      });
      productByName[name] = product;
    }
  }

  // --- Delivery areas ----------------------------------------------------
  for (const [name, charge] of AREAS) {
    await prisma.deliveryArea.create({ data: { name, charge } });
  }
  const areas = await prisma.deliveryArea.findMany();

  // --- Offers ------------------------------------------------------------
  for (const offer of OFFERS) {
    await prisma.offer.create({ data: offer });
  }

  // --- Sample orders -----------------------------------------------------
  const SAMPLE_ORDERS = [
    { name: 'Ayesha Khan', phone: '03001234567', status: 'CLOSED', lines: [['Vanilla', 2], ['Pista Kulfi', 4]] },
    { name: 'Bilal Ahmed', phone: '03111234567', status: 'CLOSED', lines: [['Chocolate Fudge Brownie', 1], ['Mango', 1]] },
    { name: 'Sara Malik', phone: '03212345678', status: 'DISPATCHED', lines: [['Dark Velvet', 1]] },
    { name: 'Hamza Sheikh', phone: '03331234567', status: 'ACCEPTED', lines: [['Anjeer', 1], ['Cadbury Crunch', 1]] },
    { name: 'Fatima Noor', phone: '03451234567', status: 'PENDING', lines: [['Strawberry Cheesecake', 2]] },
    { name: 'Usman Tariq', phone: '03091234567', status: 'PENDING', lines: [['Three Milk Cake', 1], ['Coffee', 1]] },
  ];

  for (const sample of SAMPLE_ORDERS) {
    const area = areas[Math.floor(Math.random() * areas.length)];
    let subtotal = 0;
    const items = sample.lines.map(([productName, qty]) => {
      const p = productByName[productName];
      subtotal += p.price * qty;
      return { productId: p.id, productName: p.name, price: p.price, quantity: qty };
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerName: sample.name,
        phone: sample.phone,
        address: 'Sample address, Karachi',
        areaId: area.id,
        areaName: area.name,
        subtotal,
        deliveryCharge: area.charge,
        total: subtotal + area.charge,
        status: 'PENDING',
        items: { create: items },
      },
    });
    // Move to the target status so updatedAt reflects realised income.
    if (sample.status !== 'PENDING') {
      await prisma.order.update({ where: { id: order.id }, data: { status: sample.status } });
    }
  }

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    areas: await prisma.deliveryArea.count(),
    offers: await prisma.offer.count(),
    orders: await prisma.order.count(),
  };
  console.log('Seed complete:', counts);
  console.log('Admin logins:');
  for (const acc of adminAccounts) {
    console.log(`  ${acc.role.padEnd(16)} ${acc.email} / ${acc.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
