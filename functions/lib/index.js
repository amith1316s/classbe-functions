"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const token_validator_1 = require("./auth/token-validator");
const admin_role_validator_1 = require("./auth/admin-role-validator");
const payments_1 = require("./api/payments");
const users_1 = require("./api/users");
admin.initializeApp(functions.config().firebase);
const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: true }));
app.use(cookieParser());
app.use("/users", token_validator_1.validateFirebaseIdToken, admin_role_validator_1.adminRoleValidate, users_1.userRouter);
app.use("/payments", token_validator_1.validateFirebaseIdToken, payments_1.paymentRouter);
app.get("*", async (req, res) => {
    res.status(404).send("Not found");
});
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map