"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express = require("express");
const admin = require("firebase-admin");
// This is the router which will be imported in our
// api hub (the index.ts which will be sent to Firebase Functions).
exports.userRouter = express.Router();
// Now that we have a router, we can define routes which this router
// will handle. Please look into the Express documentation for more info.
exports.userRouter.put("/:uid", async function updateUserActive(req, res) {
    const uid = req.params.uid;
    try {
        const userRecord = await admin.auth().getUser(uid);
        await admin.auth().updateUser(uid, {
            disabled: !userRecord.disabled,
        });
        res.status(200).send({ error: null, code: 200 });
    }
    catch (_a) {
        res.status(400).send({ error: `No users found!`, code: 400 });
    }
});
exports.userRouter.get("*", async (req, res) => {
    res.status(404).send("No found");
});
//# sourceMappingURL=index.js.map