"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const usersApi = require("./api/users");
admin.initializeApp(functions.config().firebase);
const app = express();
app.disable("x-powered-by");
// Any requests to /api/users will be routed to the user router!
app.use("/users", usersApi.userRouter);
app.get("*", async (req, res) => {
    res.status(404).send("Not found");
});
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map