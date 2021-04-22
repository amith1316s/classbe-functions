"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express = require("express");
const admin = require("firebase-admin");
const env_1 = require("../../env/env");
// This is the router which will be imported in our
// api hub (the index.ts which will be sent to Firebase Functions).
exports.userRouter = express.Router();
// Now that we have a router, we can define routes which this router
// will handle. Please look into the Express documentation for more info.
exports.userRouter.put("/:uid", async function updateUserActive(req, res) {
    const uid = req.params.uid;
    const db = admin.firestore();
    try {
        const userRecord = await admin.auth().getUser(uid);
        await admin.auth().updateUser(uid, {
            disabled: !userRecord.disabled,
        });
        await db.collection(env_1.env.FIRESTORE_COLLECTIONS.USERS).doc(uid).update({
            disabled: !userRecord.disabled,
        });
        res.status(200).send({ error: null, code: 200 });
    }
    catch (_a) {
        res.status(400).send({ error: "Something went wrong!", code: 400 });
    }
});
exports.userRouter.get("*", async (req, res) => {
    res.status(404).send("No found");
});
//# sourceMappingURL=index.js.map