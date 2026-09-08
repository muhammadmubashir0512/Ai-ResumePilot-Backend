import { Router } from "express";
import {
  getSubscriptionData,
  Stripepayment,
} from "../controllers/checkout.controller.js";
import verifyJWT from "../middleware/auth.middleware.js";

const checkoutRoute = Router();

checkoutRoute.post("/stripe/payment", verifyJWT, Stripepayment);
checkoutRoute.get("/stripe/currentPlan", verifyJWT, getSubscriptionData);

export default checkoutRoute;
