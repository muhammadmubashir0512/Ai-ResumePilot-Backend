import ApiError from "../utils/ApiError.js";
import stripe from "../config/stripe.js";
import { Subscription } from "../models/Subscription.model.js";
import { PLANS } from "../config/PlanLimit.js";

const CheckoutSession = async ({ plan, userId }) => {
  let priceId;

  switch (plan) {
    case "premium":
      priceId = process.env.STRIPE_PRICE_ID_PREMIUM;
      break;

    case "pro":
      priceId = process.env.STRIPE_PRICE_ID_PRO;
      break;

    default:
      throw new ApiError(400, "Invalid Subscription Plan");
  }

  if (!priceId) {
    throw new ApiError(500, "Stripe price ID is not configured");
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    metadata: {
      userId: userId.toString(),
      plan,
    },
    subscription_data: {
      metadata: {
        userId: userId.toString(),
        plan,
      },
    },
    success_url: `${process.env.ORIGIN}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.ORIGIN}/payment/cancel`,
  });

  return session.url;
};

const getPeriodEnd = (stripeSubscription) => {
  const item = stripeSubscription.items?.data?.[0];
  const ts = item?.current_period_end ?? stripeSubscription.current_period_end;
  return ts ? new Date(ts * 1000) : null;
};

const StripeWebhookResult = async (signature, rawbody) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawbody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    throw new ApiError(400, "Invalid webhook signature");
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      const { userId, plan } = session.metadata || {};

      if (!userId || !plan) {
        throw new ApiError(400, "Checkout session metadata is missing");
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(
        session.subscription,
      );

      await Subscription.findOneAndUpdate(
        {
          SubscribedUser: userId,
        },
        {
          SubscribedUser: userId,
          subscriptionPlan: plan,
          subscriptionStatus: stripeSubscription.status,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: stripeSubscription.id,
          currentPeriodEnd: getPeriodEnd(stripeSubscription),
        },
        {
          new: true,
          upsert: true,
        },
      );

      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object;

      if (!invoice.subscription) {
        break;
      }

      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoice.subscription,
      });

      if (!subscription) {
        break;
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(
        invoice.subscription,
      );

      await Subscription.findByIdAndUpdate(
        subscription._id,
        {
          subscriptionStatus: stripeSubscription.status,
          currentPeriodEnd: getPeriodEnd(stripeSubscription),
        },
        {
          new: true,
        },
      );

      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;

      if (!invoice.subscription) {
        break;
      }

      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoice.subscription,
      });

      if (!subscription) {
        break;
      }

      await Subscription.findByIdAndUpdate(
        subscription._id,
        {
          subscriptionStatus: "past_due",
        },
        {
          new: true,
        },
      );

      break;
    }

    case "customer.subscription.updated": {
      const stripeSubscription = event.data.object;

      const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
      });

      if (!subscription) {
        break;
      }

      const plan = stripeSubscription.metadata?.plan;

      const updateData = {
        subscriptionStatus: stripeSubscription.status,
        stripeCustomerId: stripeSubscription.customer,
        currentPeriodEnd: getPeriodEnd(stripeSubscription),
      };

      if (plan) {
        updateData.subscriptionPlan = plan;
      }

      await Subscription.findByIdAndUpdate(subscription._id, updateData, {
        new: true,
      });

      break;
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = event.data.object;

      const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
      });

      if (!subscription) {
        break;
      }

      await Subscription.findByIdAndUpdate(
        subscription._id,
        {
          subscriptionPlan: "free",
          subscriptionStatus: "canceled",
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        },
        {
          new: true,
        },
      );

      break;
    }

    default:
      break;
  }

  return true;
};

const checkUsageLimit = async ({ subscription, feature }) => {
  const plan = subscription.subscriptionPlan;

  const limit = PLANS[plan]?.features?.[feature];

  if (limit === undefined) {
    throw new ApiError(403, "Feature is not available");
  }

  if (limit === Infinity) {
    return true;
  }

  const usage = subscription.usage?.[feature];

  if (!usage) {
    throw new ApiError(403, "Usage information not found");
  }

  if (usage.count >= limit) {
    throw new ApiError(403, `${feature} monthly limit reached`);
  }

  return true;
};

const incrementUsage = async ({ subscriptionId, feature }) => {
  await Subscription.findByIdAndUpdate(subscriptionId, {
    $inc: {
      [`usage.${feature}.count`]: 1,
    },
  });
};

const subscriptionData = async ({ userId }) => {
  const data = await Subscription.findOne({ SubscribedUser: userId });
  return data;
};

export {
  CheckoutSession,
  StripeWebhookResult,
  checkUsageLimit,
  incrementUsage,
  subscriptionData,
};
