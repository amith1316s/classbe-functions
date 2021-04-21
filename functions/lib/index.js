"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const usersApi = require("./api/users");
const token_validator_1 = require("./auth/token-validator");
const admin_role_validator_1 = require("./auth/admin-role-validator");
admin.initializeApp(functions.config().firebase);
const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: true }));
app.use(cookieParser());
app.use(token_validator_1.validateFirebaseIdToken);
app.use(admin_role_validator_1.adminRoleValidate);
// Any requests to /api/users will be routed to the user router!
app.use("/users", usersApi.userRouter);
app.get("*", async (req, res) => {
    res.status(404).send("Not found");
});
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map