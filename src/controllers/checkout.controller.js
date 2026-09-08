import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  CheckoutSession,
  checkUsageLimit,
  StripeWebhookResult,
  subscriptionData,
} from "../services/checkout.service.js";

const Stripepayment = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  const userId = req.user._id.toString();

  const result = await CheckoutSession({ plan, userId });

  return res
    .status(200)
    .json(new ApiResponse(200, { url: result }, "Session url created"));
});

const StripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const rawbody = req.body;

  const result = await StripeWebhookResult(signature, rawbody);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        result: result,
      },
      "Stripe webhook recieved",
    ),
  );
});

const UserUsageLimit = asyncHandler(async (req, res) => {
  const result = await checkUsageLimit({ subscription, feature });

  return result;
});

const getSubscriptionData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await subscriptionData({ userId });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "User Subscription Data Fetached"));
});

export { Stripepayment, StripeWebhook, UserUsageLimit, getSubscriptionData };
