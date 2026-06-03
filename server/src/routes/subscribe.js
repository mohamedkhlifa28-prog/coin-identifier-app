'use strict';

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/database');

const router = express.Router();

function getStripe() {
  const Stripe = require('stripe');
  return Stripe(process.env.STRIPE_SECRET_KEY);
}

const PRICE_CONFIG = {
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    amount: 399, // $3.99 in cents
    name: 'CoinVault Pro',
    tier: 'pro',
  },
  expert: {
    priceId: process.env.STRIPE_EXPERT_PRICE_ID || 'price_expert_monthly',
    amount: 999, // $9.99 in cents
    name: 'CoinVault Expert',
    tier: 'expert',
  },
};

// POST /api/subscribe
router.post('/', authMiddleware, async (req, res) => {
  const { tier, successUrl, cancelUrl } = req.body;

  if (!tier || !PRICE_CONFIG[tier]) {
    return res.status(400).json({ error: 'Invalid tier. Must be "pro" or "expert"' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Payment service not configured' });
  }

  try {
    const stripe = getStripe();
    const config = PRICE_CONFIG[tier];

    // Create or retrieve Stripe customer
    let customerId = user.subscription_id;
    if (!customerId || !customerId.startsWith('cus_')) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      db.prepare('UPDATE users SET subscription_id = ? WHERE id = ?').run(customerId, user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: config.name },
            unit_amount: config.amount,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?subscribed=true`,
      cancel_url: cancelUrl || `${process.env.CLIENT_URL || 'http://localhost:5173'}/pricing`,
      metadata: { userId: user.id, tier },
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session', details: err.message });
  }
});

// POST /api/subscribe/cancel
router.post('/cancel', authMiddleware, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!user || user.subscription_tier === 'free') {
    return res.status(400).json({ error: 'No active subscription to cancel' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    // In dev/test mode, just downgrade
    db.prepare("UPDATE users SET subscription_tier = 'free', subscription_id = NULL WHERE id = ?").run(user.id);
    return res.json({ message: 'Subscription cancelled successfully' });
  }

  try {
    const stripe = getStripe();

    if (user.subscription_id && user.subscription_id.startsWith('sub_')) {
      await stripe.subscriptions.cancel(user.subscription_id);
    } else if (user.subscription_id && user.subscription_id.startsWith('cus_')) {
      // Find active subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: user.subscription_id,
        status: 'active',
      });
      for (const sub of subscriptions.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }

    db.prepare("UPDATE users SET subscription_tier = 'free' WHERE id = ?").run(user.id);

    return res.json({ message: 'Subscription cancelled successfully' });
  } catch (err) {
    console.error('Stripe cancel error:', err.message);
    return res.status(500).json({ error: 'Failed to cancel subscription', details: err.message });
  }
});

// GET /api/subscribe/status
router.get('/status', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, subscription_tier, subscription_id, email FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const tierDetails = {
    free: { name: 'Free', scanLimit: 10, features: ['10 scans/month', 'Basic collection'] },
    pro: { name: 'Pro', scanLimit: -1, features: ['Unlimited scans', 'AI grading', 'Error detection', 'All features'] },
    expert: { name: 'Expert', scanLimit: -1, features: ['Everything in Pro', 'Priority support', 'Advanced analytics'] },
  };

  return res.json({
    tier: user.subscription_tier,
    details: tierDetails[user.subscription_tier] || tierDetails.free,
    hasActiveSubscription: user.subscription_tier !== 'free',
  });
});

// POST /api/subscribe/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(200).json({ received: true });
  }

  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: err.message });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata && session.metadata.userId;
      const tier = session.metadata && session.metadata.tier;
      if (userId && tier) {
        db.prepare('UPDATE users SET subscription_tier = ? WHERE id = ?').run(tier, userId);
        console.log(`User ${userId} upgraded to ${tier}`);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);
      const userId = customer.metadata && customer.metadata.userId;
      if (userId) {
        db.prepare("UPDATE users SET subscription_tier = 'free' WHERE id = ?").run(userId);
        console.log(`User ${userId} downgraded to free`);
      }
      break;
    }
    case 'invoice.payment_failed': {
      console.warn('Payment failed for invoice:', event.data.object.id);
      break;
    }
    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }

  return res.json({ received: true });
});

module.exports = router;
