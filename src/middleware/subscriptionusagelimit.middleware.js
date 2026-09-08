import { Subscription } from "../models/Subscription.model.js";
import { checkUsageLimit } from "../services/checkout.service.js";

const usageLimit = (feature) => {
  return async (req, res, next) => {
    try {
      const subscription = await Subscription.findOne({
        SubscribedUser: req.user._id,
      });

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: "Subscription not found",
        });
      }

      await checkUsageLimit({
        subscription,
        feature,
      });

      req.subscription = subscription;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default usageLimit;
