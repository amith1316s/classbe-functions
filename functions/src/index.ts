import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cookieParser from "cookie-parser";
import * as cors from "cors";
import { validateFirebaseIdToken } from "./auth/token-validator";
import { adminRoleValidate } from "./auth/admin-role-validator";
import { stripeRouter } from "./api/stripe";
import { userRouter } from "./api/users";
import { paymentRouter } from "./api/payments";
import { validateStripeWebhook } from "./auth/stripe-webhook-validator";

admin.initializeApp(functions.config().firebase);

const app = express();

app.disable("x-powered-by");

app.use(cors({ origin: true }));
app.use(cookieParser());

app.use("/users", validateFirebaseIdToken, adminRoleValidate, userRouter);
app.use("/stripe", validateFirebaseIdToken, stripeRouter);
app.use("/payments", validateStripeWebhook, paymentRouter);

app.get("*", async (req: express.Request, res: express.Response) => {
  res.status(404).send("Not found");
});

exports.api = functions.https.onRequest(app);
