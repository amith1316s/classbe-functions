import * as express from "express";
import * as functions from "firebase-functions";
import { Stripe } from "stripe";

export const validateStripeWebhook = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  functions.logger.log("Check if request comes from stripe webhook.");

  const signinSecret = req.headers["stripe-signature"];

  try {
    if (signinSecret) {
      new Stripe(functions.config().stripe.restrictedkey, {
        apiVersion: "2020-08-27",
      }).webhooks.constructEvent(
        (req as any).rawBody, // typescript doesn't recognize rawBody
        signinSecret,
        functions.config().stripe.webhooksigninsecret
      );
      next();
      return;
    } else {
      res
        .status(403)
        .send({ code: 403, message: "Request must have signature" });
      return;
    }
  } catch (error) {
    res.status(403).send({ code: 403, message: error });
    return;
  }
};
