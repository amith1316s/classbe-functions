import * as express from "express";
import {
  RtcTokenBuilder,
  RtmTokenBuilder,
  RtcRole,
  RtmRole,
} from "agora-access-token";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { env } from "../../env/env";

export async function getTempRtcToken(
  req: express.Request,
  res: express.Response
) {
  const appId = functions.config().agora.appid;
  const appCertificate = functions.config().agora.certificate;

  const db = admin.firestore();
  const userRef = db
    .collection(env.FIRESTORE_COLLECTIONS.USERS)
    .doc(req.body.user.uid);
  const chatRef = db
    .collection(env.FIRESTORE_COLLECTIONS.CHATS)
    .doc(req.params.channelId);

  const siteConfigs = await getSiteConfigs();
  let user = null;

  if (!siteConfigs || !siteConfigs.demoTime) {
    res.status(400).send({
      error: "Something went wrong",
      code: 400,
    });
    return;
  }

  try {
    user = (await userRef.get()).data();
    if (!user || !user.intUID) {
      res.status(400).send({
        error: "Token generation failed due to invalid user",
        code: 400,
      });
      return;
    }
  } catch (error) {
    res.status(400).send({
      error: "Token generation failed due to invalid user",
      code: 400,
    });
    return;
  }

  try {
    const chatData = (await chatRef.get()).data();
    if (!chatData) {
      res.status(400).send({
        error: "No channel found",
        code: 400,
      });
      return;
    }

    if (chatData.demoTokenGeneratedBy.indexOf(req.body.user.uid) >= 0) {
      res.status(400).send({
        error: "You have already generated a token",
        code: 400,
      });
      return;
    }
  } catch (error) {
    res.status(400).send({
      error: "You have already generated a token",
      code: 400,
    });
    return;
  }

  const expirationTimeInSeconds = +siteConfigs?.demoTime * 60;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  try {
    const token = RtcTokenBuilder.buildTokenWithAccount(
      appId,
      appCertificate,
      req.params.channelId,
      user.intUID,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );
    functions.logger.debug("Token With UserAccount: " + token);

    await chatRef.update({
      demoTokenGenerated: true,
      demoTokenExpiresAt: new Date().toISOString(),
      demoTokenGeneratedBy: admin.firestore.FieldValue.arrayUnion(
        req.body.user.uid
      ),
    });

    res.status(200).send({ error: null, code: 200, token: token });
  } catch (error) {
    functions.logger.debug(error);
    res.status(400).send({ error: "Token generation failed", code: 400 });
  }
}

export async function getTempRtmToken(
  req: express.Request,
  res: express.Response
) {
  const appID = functions.config().agora.appid;
  const appCertificate = functions.config().agora.certificate;

  const siteConfigs = await getSiteConfigs();
  if (!siteConfigs || !siteConfigs.demoTime) {
    res.status(400).send({
      error: "Something went wrong",
      code: 400,
    });
    return;
  }

  const expirationTimeInSeconds = +siteConfigs?.demoTime * 60;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  try {
    const token = RtmTokenBuilder.buildToken(
      appID,
      appCertificate,
      req.body.user.uid,
      RtmRole.Rtm_User,
      privilegeExpiredTs
    );
    functions.logger.debug("Token With UserAccount: " + token);

    res.status(200).send({ error: null, code: 200, token: token });
  } catch (error) {
    functions.logger.debug(error);
    res.status(400).send({ error: "Token generation failed", code: 400 });
  }
}

async function getSiteConfigs() {
  const db = admin.firestore();

  const configRef = db
    .collection(env.FIRESTORE_COLLECTIONS.CONFIGS)
    .doc("configs");

  try {
    return (await configRef.get()).data() || null;
  } catch (error) {
    functions.logger.error("Error while getting site configs", error);
    return null;
  }
}
