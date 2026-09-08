import { Subscription } from "../models/Subscription.model.js";

const requireSubscription = (...allowedPlans) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const subscription = await Subscription.findOne({
        SubscribedUser: user._id,
      });

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: "Subscription not found",
        });
      }

      if (
        subscription.subscriptionStatus !== "active" &&
        subscription.subscriptionStatus !== "trialing"
      ) {
        return res.status(403).json({
          success: false,
          message: "Active subscription required",
        });
      }

      if (!allowedPlans.includes(subscription.subscriptionPlan)) {
        return res.status(403).json({
          success: false,
          message: "This feature is not available on your plan",
        });
      }

      req.subscription = subscription;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default requireSubscription;
