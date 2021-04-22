"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const token_validator_1 = require("./auth/token-validator");
const admin_role_validator_1 = require("./auth/admin-role-validator");
const stripe_1 = require("./api/stripe");
const users_1 = require("./api/users");
const payments_1 = require("./api/payments");
const stripe_webhook_validator_1 = require("./auth/stripe-webhook-validator");
admin.initializeApp(functions.config().firebase);
const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: true }));
app.use(cookieParser());
app.use("/users", token_validator_1.validateFirebaseIdToken, admin_role_validator_1.adminRoleValidate, users_1.userRouter);
app.use("/stripe", token_validator_1.validateFirebaseIdToken, stripe_1.stripeRouter);
app.use("/payments", stripe_webhook_validator_1.validateStripeWebhook, payments_1.paymentRouter);
app.get("*", async (req, res) => {
    res.status(404).send("Not found");
});
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map