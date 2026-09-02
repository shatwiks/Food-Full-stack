import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma.js';

dotenv.config();

async function main() {
  console.log('Seeding database with demo users, restaurants, and menu items...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Demo Users
  const customer = await prisma.user.upsert({
    where: { email: 'customer@orderflow.com' },
    update: {},
    create: {
      email: 'customer@orderflow.com',
      password: passwordHash,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: 'CUSTOMER',
    },
  });

  const customerDev = await prisma.user.upsert({
    where: { email: 'customer@orderflow.dev' },
    update: {},
    create: {
      email: 'customer@orderflow.dev',
      password: passwordHash,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: 'CUSTOMER',
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@orderflow.com' },
    update: {},
    create: {
      email: 'owner@orderflow.com',
      password: passwordHash,
      firstName: 'Chef Marco',
      lastName: 'Rossi',
      role: 'RESTAURANT_OWNER',
    },
  });

  const ownerDev = await prisma.user.upsert({
    where: { email: 'owner@orderflow.dev' },
    update: {},
    create: {
      email: 'owner@orderflow.dev',
      password: passwordHash,
      firstName: 'Chef Marco',
      lastName: 'Rossi',
      role: 'RESTAURANT_OWNER',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@orderflow.com' },
    update: {},
    create: {
      email: 'admin@orderflow.com',
      password: passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
    },
  });

  const adminDev = await prisma.user.upsert({
    where: { email: 'admin@orderflow.dev' },
    update: {},
    create: {
      email: 'admin@orderflow.dev',
      password: passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
    },
  });

  console.log('Users seeded:', {
    customer: customer.email,
    customerDev: customerDev.email,
    owner: owner.email,
    ownerDev: ownerDev.email,
    admin: admin.email,
    adminDev: adminDev.email,
  });

  // 2. Restaurants data
  const restaurantConfigs = [
    {
      name: 'Bella Italia Trattoria',
      slug: 'bella-italia-trattoria',
      cuisine: 'Italian',
      description: 'Authentic handcrafted wood-fired pizzas, artisanal pasta, and Tuscan wines.',
      address: '142 Via Roma, Downtown',
      phone: '+1 (555) 234-5678',
      ownerId: owner.id,
      menuItems: [
        { name: 'Margherita Woodfired Pizza', description: 'San Marzano tomatoes, fresh buffalo mozzarella, fresh basil, extra virgin olive oil', price: 14.99 },
        { name: 'Truffle Tagliatelle', description: 'Fresh pasta ribbons tossed with black truffle butter sauce and aged Parmigiano Reggiano', price: 18.50 },
        { name: 'Burrata Caprese Salad', description: 'Creamy burrata cheese, heirloom tomatoes, balsamic glaze, basil pesto', price: 12.50 },
        { name: 'Classic Tiramisu', description: 'Espresso-soaked savoiardi biscuits layered with silky mascarpone cream and cocoa', price: 8.00 },
        { name: 'San Pellegrino Sparkling Water', description: 'Crisp Italian sparkling mineral water (500ml)', price: 3.50 },
      ],
    },
    {
      name: 'Taqueria El Fuego',
      slug: 'taqueria-el-fuego',
      cuisine: 'Mexican',
      description: 'Street-style tacos, slow-cooked birria, sizzling fajitas, and house-made salsas.',
      address: '88 Mission Blvd, Arts District',
      phone: '+1 (555) 345-6789',
      ownerId: owner.id,
      menuItems: [
        { name: 'Birria Tacos (3 pcs)', description: 'Slow-braised beef birria tacos with melted cheese, cilantro, onions, and rich dipping consommé', price: 13.99 },
        { name: 'Carne Asada Burrito', description: 'Grilled marinated flank steak, Mexican rice, pinto beans, guacamole, and salsa verde', price: 12.50 },
        { name: 'Fresh Guacamole & House Chips', description: 'Freshly smashed Hass avocados, lime juice, sea salt, served with warm corn tortilla chips', price: 7.50 },
        { name: 'Crispy Cinnamon Churros', description: 'Fresh fried pastry rolled in cinnamon sugar with warm dulce de leche dip', price: 6.00 },
        { name: 'Horchata Fresca', description: 'Traditional rice milk spiced with Mexican cinnamon and vanilla bean', price: 4.00 },
      ],
    },
    {
      name: 'Tokyo Ramen & Sushi Bar',
      slug: 'tokyo-ramen-sushi',
      cuisine: 'Japanese',
      description: 'Slow-simmered 18-hour broths, fresh sashimi, signature maki rolls, and matcha desserts.',
      address: '205 Sakura Way, Japantown',
      phone: '+1 (555) 456-7890',
      ownerId: owner.id,
      menuItems: [
        { name: 'Tonkotsu Chashu Ramen', description: 'Rich pork bone broth, tender braised chashu, ajitsuke tamago egg, nori, scallions, bamboo shoots', price: 15.50 },
        { name: 'Spicy Salmon Crunch Roll', description: 'Wild salmon, cucumber, avocado topped with spicy mayo, masago, and tempura flakes', price: 14.00 },
        { name: 'Crispy Pork Gyoza (6 pcs)', description: 'Pan-seared Japanese dumplings filled with seasoned pork and scallions, sesame ponzu dip', price: 7.99 },
        { name: 'Japanese Matcha Cheesecake', description: 'Velvety Uji green tea cheesecake with black sesame crust', price: 6.50 },
        { name: 'Iced Jasmine Green Tea', description: 'Cold brewed fragrant jasmine green tea with lemon hint', price: 3.50 },
      ],
    },
    {
      name: 'Artisan Craft Burgers',
      slug: 'artisan-craft-burgers',
      cuisine: 'American',
      description: 'Grass-fed wagyu smash burgers, hand-cut truffle fries, and decadent thick milkshakes.',
      address: '500 Main Street, Central Plaza',
      phone: '+1 (555) 567-8901',
      ownerId: owner.id,
      menuItems: [
        { name: 'The Truffle Wagyu Smash Burger', description: 'Double smashed wagyu patties, black truffle aioli, aged sharp cheddar, caramelized onions, brioche bun', price: 14.50 },
        { name: 'Smoky BBQ Bacon Burger', description: 'Crispy hardwood smoked bacon, smoked gouda, onion rings, house bourbon BBQ sauce', price: 13.99 },
        { name: 'Parmesan Truffle Fries', description: 'Hand-cut russet potatoes tossed in white truffle oil, grated parmesan, and fresh rosemary', price: 5.99 },
        { name: 'Salted Caramel Pretzel Shake', description: 'Creamy vanilla bean ice cream spun with salted caramel ribbons and crushed pretzel crust', price: 6.50 },
      ],
    },
    {
      name: 'Spice Route Biryani & Curry',
      slug: 'spice-route-biryani',
      cuisine: 'Indian',
      description: 'Fragrant Dum biryanis, aromatic curries cooked with whole spices, and tandoori breads.',
      address: '77 Heritage Lane, Westside',
      phone: '+1 (555) 678-9012',
      ownerId: owner.id,
      menuItems: [
        { name: 'Hyderabadi Dum Chicken Biryani', description: 'Aromatic basmati rice layered with spiced tender chicken, saffron, mint, served with mirchi ka salan and raita', price: 16.00 },
        { name: 'Butter Chicken with Garlic Naan', description: 'Tender tandoor-roasted chicken in a creamy tomato butter gravy, paired with hot garlic naan bread', price: 15.50 },
        { name: 'Paneer Tikka Masala', description: 'Charred cottage cheese cubes simmered in spiced bell pepper masala gravy', price: 13.99 },
        { name: 'Alphonso Mango Lassi', description: 'Smooth churned yogurt beverage sweetened with fragrant Alphonso mango pulp', price: 4.50 },
      ],
    },
  ];

  for (const rData of restaurantConfigs) {
    const { menuItems, ...restInfo } = rData;
    const restaurant = await prisma.restaurant.upsert({
      where: { slug: restInfo.slug },
      update: restInfo,
      create: restInfo,
    });

    console.log(`Synced restaurant: ${restaurant.name}`);

    for (const item of menuItems) {
      const existing = await prisma.menuItem.findFirst({
        where: { restaurantId: restaurant.id, name: item.name },
      });

      if (!existing) {
        await prisma.menuItem.create({
          data: {
            restaurantId: restaurant.id,
            name: item.name,
            description: item.description,
            price: item.price,
            isAvailable: true,
          },
        });
      }
    }
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
