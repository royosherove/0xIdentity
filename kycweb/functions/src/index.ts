import * as firebaseFunctions from "firebase-functions";
import * as firebaseAdmin from "firebase-admin";
import { ethers } from "ethers";
import { CallableContext } from "firebase-functions/v1/https";

const cors = require("cors")({ origin: true });
const admin = firebaseAdmin.initializeApp();
const IDENTITIES = "identities";
const VERIFICATIONS = "verifications";
const NFTS = "nfts";
// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
 async function makeSig(contractAddress: string, sender: string, chain:string) {
  const eu = ethers.utils;
  if(chain===''){
    return {error:"chain arg missing",code:400}
  }
  const prov = new ethers.providers.JsonRpcProvider(process.env[('CHAIN_' + chain)]);
  const signerpk = process.env.SIGNER_PK || "";
  console.log("pk was " + signerpk);
  const signer = new ethers.Wallet(signerpk);
  const currentBlock = await prov.getBlockNumber();
  const expireBlock = currentBlock + 20;
  const contract = new ethers.Contract(
    contractAddress,
    ["function nonces(address what) public view returns (uint256)"],
    prov
  );
  const nonce = await contract.nonces(sender);
  console.log("-> JS: expireblock: ", expireBlock);
  console.log("-> JS: nonce: ", nonce);
  console.log("-> JS: sender ", sender);
  console.log("-> JS: good signer ", signer.address);
  const { chainId } = await prov.getNetwork();

  const packed = eu.solidityKeccak256(
    ["address", "uint256", "address", "uint256", "uint256"],
    [sender, expireBlock, contract.address, nonce, chainId]
  );
  const packedBytes = eu.arrayify(packed);
  const signedMessage = await signer.signMessage(packedBytes);
  return {sig: signedMessage, expireBlock,code:200};
}
async function _dbAddVerification(uid: string, data: any) {
  await admin
    .firestore()
    .collection(IDENTITIES)
    .doc(uid)
    .collection(VERIFICATIONS)
    .doc(data.inquiryId || data.InquiryId)
    .set(data);
}
async function _dbChangeNonce(address: string) {
  const randomNonce = _randomNonce();
  await admin.firestore().collection(IDENTITIES).doc(address).update({
    nonce: randomNonce,
  });
  return randomNonce;
}
async function _dbChangeUserNftProgress(uid: string, nftProgress: string) {
  await admin.firestore().collection(NFTS).doc(uid).set({
    nftProgress,
  });
}
// async function _dbChangeUserNft(uid: string, nftProgress: string,nftId:string,nftAddress:string,chainId:string,block:number) {
//   await admin.firestore().collection(NFTS).doc(uid).update({
//     nftProgress,
//     nftId,
//     nftAddress,
//     chainId,
//     block
//   });
// }
async function _dbAddUser(address: string, tries: number, progress: string) {
  await admin.firestore().collection(IDENTITIES).doc(address).set({
    progress,
    tries,
  });
}
async function _dbChangeUser(address: string, tries: number, progress: string) {
  await admin.firestore().collection(IDENTITIES).doc(address).update({
    progress,
    tries,
  });
}
async function _dbGetDocForAddress(address: string) {
  return await admin.firestore().collection(IDENTITIES).doc(address).get();
}

async function _makeUserAndNonce(address: string) {
  const createdUser = await admin.auth().createUser({ uid: address });
  await _dbAddUser(address, 0, "new");
  const nonce = await _dbChangeNonce(address);
  return { createdUser, nonce };
}

function _randomNonce() {
  return Math.floor(Math.random() * 100000).toString();
}
// async function signSig(nonce: string, block: number, chainId: string) {
//   const wallet = new ethers.Wallet(process.env.SIGNER_PK as string);
//   const sig = await wallet.signMessage(nonce);
//   return sig;
// }
/////////////////////////////////////////////////
///////////////  API FUNCTIONS  /////////////////
/////////////////////////////////////////////////
const getSig = firebaseFunctions
  .region("us-central1")
  .https.onCall(async (data, context: CallableContext) => {
    try {
      if (!context.auth) {
        return { error: "Not authenticated", code: 401 };
      }
      console.log("data: ", data);
      const uid = context.auth.uid;
      const userDoc = await _dbGetDocForAddress(uid);
      if (!userDoc.exists) {
        return { error: "doc not found for " + uid, code: 400 };
      }
      const sig = await makeSig(data.contract, data.sender, data.chain);
      await _dbChangeNonce(uid);

      return { sig, message: "ok", code: 200 };
    } catch (error: any) {
      return { msg: error.message, error: JSON.stringify(error) };
    }
  });

const updateInquiry = firebaseFunctions
  .region("us-central1")
  .https.onCall(async (incomingData, context: CallableContext) => {
    try {
      if (!context.auth) {
        return { error: "Not authenticated", code: 401 };
      }
      const uid = context.auth.uid;
      const userDoc = await _dbGetDocForAddress(uid);
      if (!userDoc.exists) {
        return { error: "doc not found" + uid, code: 400 };
      }
      await _dbChangeNonce(uid);
      const userData = userDoc.data();
      if (
        incomingData.status === "completed" &&
        incomingData.fields.length >= 1 &&
        incomingData.fields[0].id !== undefined &&
        incomingData.fields[0].type !== undefined
      ) {
        incomingData.timestamp = Date.now();
        await _dbAddVerification(uid, incomingData);
        await _dbChangeUser(uid, userData?.tries + 1, "verified");
        await _dbChangeUserNftProgress(uid, "allowed");

        return { message: "ok", code: 200 };
      }
      return { message: "not verified", code: 200 };
    } catch (error: any) {
      return { error: error.message, code: 401 };
    }
  });
const verifySig = firebaseFunctions.https.onRequest((request, response) =>
  cors(request, response, async () => {
    try {
      const address = request.query.address as string;
      const sig = request.query.sig as string;
      if (
        address === undefined ||
        !ethers.utils.isAddress(address) ||
        sig === undefined
      ) {
        return response
          .status(400)
          .json({ error: "one of the query fields is missing" });
      }
      let userDoc = await _dbGetDocForAddress(address);
      if (!userDoc.exists) {
        //must getNonce() first
        return response.status(400).json({ error: "no such user" });
      }
      const nonce = userDoc.data()?.nonce;
      const oldTries = userDoc.data()?.tries;
      const recovered = ethers.utils.verifyMessage(nonce, sig);
      if (recovered.toLowerCase() === address.toLowerCase()) {
        await _dbChangeUser(address, oldTries + 1, "verified");
        await _dbChangeNonce(address);
        const auth = await admin.auth();
        const customToken = await auth.createCustomToken(address);
        return response.status(200).json({ status: "success", customToken });
      }
      await _dbChangeUser(address, oldTries + 1, "failed");
      await _dbChangeNonce(address);
      return response
        .status(400)
        .json({ error: "signature verification failed" });
    } catch (error) {
      return response.status(400).json(error);
    }
  })
);
const getNonce = firebaseFunctions.https.onRequest((request, response) =>
  cors(request, response, async () => {
    const address = request.query.address as string;
    if (address === undefined || !ethers.utils.isAddress(address)) {
      return response.status(400).json({ error: "invalid address" });
    }
    const found = await _dbGetDocForAddress(address);
    if (found.exists) {
      const n = found.data()?.nonce;
      if (n !== undefined) return response.status(200).json({ nonce: n });
    }
    const { nonce } = await _makeUserAndNonce(address as string);
    return response.status(200).json({ nonce });
  })
);

export { getNonce, verifySig, updateInquiry, getSig };
