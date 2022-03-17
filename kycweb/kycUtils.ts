import { ethers } from "ethers";
import { FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import { Fields } from "persona/dist/lib/interfaces";

const url_nonce = process.env.NEXT_PUBLIC_FN_NONCE;
const url_verifySig = process.env.NEXT_PUBLIC_FN_VERIFY_SIG;
const url_api_key = process.env.NEXT_PUBLIC_FN_VERIFY_SIG;
const contract_address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const CURRENT_CHAIN = '0';

export async function burnNft(uid: string, app: FirebaseApp) {
  const eu = ethers.utils;
  const result:any = await getSig(uid, app);
  console.log("sigresult:", result)
  const prov = new ethers.providers.Web3Provider((window as any).ethereum);
  const accounts = await prov.send("eth_requestAccounts", []);
  const contract = new ethers.Contract(
    contract_address || "",
    [
      "function burn(uint256 expiresAt, bytes calldata signature) public",
    ],
    prov.getSigner()
  );
  await contract.burn(result?.data.sig.expireBlock || '', result?.data.sig.sig || '');
}
export async function mintNft(uid: string, app: FirebaseApp) {
  const eu = ethers.utils;
  const result:any = await getSig(uid, app);
  console.log("sigresult:", result)
  const prov = new ethers.providers.Web3Provider((window as any).ethereum);
  const accounts = await prov.send("eth_requestAccounts", []);
  const contract = new ethers.Contract(
    contract_address || "",
    [
      "function mint(uint256 expiresAt, bytes calldata signature) public payable",
    ],
    prov.getSigner()
  );
  await contract.mint(result?.data.sig.expireBlock || '', result?.data.sig.sig || '',{value:eu.parseEther('0.00083')});
}
export async function getSig(uid: string, app: FirebaseApp) {
  try {
    const functions = getFunctions(app);
    const callableFun = httpsCallable(functions, "getSig");
    const sigResult = await callableFun({
      contract: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      sender: uid,
      chain:CURRENT_CHAIN
    });
    console.log("sig result: ", sigResult);
    console.dir(sigResult);
    return sigResult;
  } catch (error) {
    console.error(error);
  }
}
export const startVerification = async (app: FirebaseApp) => {
  const { Client } = require("persona");
  const client = new Client({
    templateId: process.env.NEXT_PUBLIC_persona_templateId_only,
    environment: process.env.NEXT_PUBLIC_persona_env,
    onReady: () => client.open(),
    onComplete: (result: PersonaResults) => {
      const filtered = filterFields(result);
      onVerificationEnded(filtered, app);
    },
    onCancel: () => console.log("onCancel"),
    onError: (error: any) => console.log(error),
  });
};
export async function onVerificationEnded(
  result: PersonaResults,
  app: FirebaseApp
) {
  try {
    console.dir(result);
    const functions = getFunctions(app);
    const callableFun = httpsCallable(functions, "updateInquiry");
    const updatedResult = await callableFun(result); 
    console.dir(updatedResult);
  } catch (error) {
    console.error(error);
  }
}

export async function getNonceForAddress(address: string) {
  const nonce = await fetch(`${url_nonce}?address=${address}`, {
    mode: "cors",
  });
  return nonce;
}
export interface PersonaResults {
  inquiryId: string;
  status: string;
  fields: Fields | any;
}
export async function personaAPIGetDocument(docID: string) {
  try {
    const fetch = require("node-fetch");

    const url = `https://withpersona.com/api/v1/documents/${docID}`;
    const options = {
      method: "GET",
      mode: "cors",
      headers: {
        Accept: "application/json",
        "Persona-Version": "2021-05-14",
        Authorization: `Bearer ${url_api_key}`,
      },
    };

    fetch(url, options)
      .then((res: { json: () => any }) => res.json())
      .then((json: any) => console.log(json))
      .catch((err: string) => console.error("error:" + err));
  } catch (error) {
    console.error(error);
  }
}
export function CheckAndInitDevMode(app: FirebaseApp) {
  const result =
    process.env.NODE_ENV == "development" &&
    process.env.NEXT_PUBLIC_FN_NONCE?.includes("127.0.0.1");
  if (result) {
    connectAuthEmulator(getAuth(app), "http://localhost:9099");
    connectFunctionsEmulator(getFunctions(app), "localhost", 5001);
  }
  return result;
}
export async function verifyAddressSig(address: string, sig: string) {
  return await fetch(
    `${url_verifySig}?address=${address}&sig=${sig}&inquiryId=0&inquiryStatus=completed`,
    { mode: "cors" }
  );
}
export function filterFields(result: PersonaResults) {
  const theFields = Object.keys(result.fields);
  return {
    status: result.status,
    inquiryId: result.inquiryId,
    fields: theFields
      .map((name) => result.fields[name].value)
      .filter((f: any) => f && f.id !== undefined),
  };
}
