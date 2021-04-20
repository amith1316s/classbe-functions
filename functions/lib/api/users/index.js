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
    admin
        .auth()
        .updateUser(uid, {
        disabled: true,
    })
        .then((userRecord) => {
        console.log("Successfully updated user", userRecord.toJSON());
    })
        .catch((error) => {
        console.log("Error updating user:", error);
    });
    res.status(200).send(`You requested user with UID = ${uid}`);
});
exports.userRouter.get("*", async (req, res) => {
    res.status(404).send("No found");
});
//# sourceMappingURL=index.js.map