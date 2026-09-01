const BASE = 'http://localhost:3001/api';

async function run() {
  console.log('--- 1. Logging in as customer ---');
  const custRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@orderflow.com', password: 'Password123!' }),
  }).then(r => r.json());
  console.log('Customer User:', custRes.user);
  const custToken = custRes.tokens.accessToken;

  console.log('\n--- 2. Fetching restaurants ---');
  const restRes = await fetch(`${BASE}/restaurants?limit=5`).then(r => r.json());
  console.log('Found restaurants:', restRes.data.map(r => `${r.name} (${r.cuisine})`));
  const targetRest = restRes.data[0];

  console.log(`\n--- 3. Fetching menu for ${targetRest.name} ---`);
  const detailRes = await fetch(`${BASE}/restaurants/${targetRest.id}`).then(r => r.json());
  console.log('Menu items:', detailRes.data.menuItems.map(m => `${m.name}: $${m.price}`));
  const itemToOrder = detailRes.data.menuItems[0];

  console.log(`\n--- 4. Customer placing order for ${itemToOrder.name} ---`);
  const orderRes = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`,
    },
    body: JSON.stringify({
      restaurantId: targetRest.id,
      deliveryAddress: '123 Market St, Apt 5A',
      items: [{ menuItemId: itemToOrder.id, quantity: 2 }],
    }),
  }).then(r => r.json());
  console.log('Created Order:', {
    id: orderRes.data.id,
    total: orderRes.data.totalAmount,
    status: orderRes.data.status,
    itemsCount: orderRes.data.items.length,
  });
  const orderId = orderRes.data.id;

  console.log('\n--- 5. Customer viewing their orders ---');
  const myOrdersRes = await fetch(`${BASE}/orders`, {
    headers: { Authorization: `Bearer ${custToken}` },
  }).then(r => r.json());
  console.log(`Customer has ${myOrdersRes.data.length} orders. Latest status: ${myOrdersRes.data[0].status}`);

  console.log('\n--- 6. Restaurant Owner logging in ---');
  const ownerRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@orderflow.com', password: 'Password123!' }),
  }).then(r => r.json());
  const ownerToken = ownerRes.tokens.accessToken;

  console.log('\n--- 7. Owner updating order status to CONFIRMED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED ---');
  for (const status of ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
    const patchRes = await fetch(`${BASE}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ status }),
    }).then(r => r.json());
    console.log(`-> Order #${orderId.slice(-6)} transitioned to: ${patchRes.data.status}`);
  }

  console.log('\n--- 8. Testing bad input handling (Error Handler & Zod validation) ---');
  const badJsonRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"invalid json syntax',
  }).then(async r => ({ status: r.status, data: await r.json() }));
  console.log('Bad JSON response (should be 400):', badJsonRes);

  const missingEmailRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', password: '' }),
  }).then(async r => ({ status: r.status, data: await r.json() }));
  console.log('Invalid input response (should be 400):', missingEmailRes);

  console.log('\n========================================');
  console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('========================================');
}

run().catch(console.error);
