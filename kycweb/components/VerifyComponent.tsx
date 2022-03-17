import { ethers } from "ethers";
import { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import { FirebaseApp } from "firebase/app";
import { getFirestore, collection, getDoc } from "firebase/firestore/lite";
import {
  verifyAddressSig,
  CheckAndInitDevMode,
  getNonceForAddress,
  onVerificationEnded,
  startVerification,
  getSig,
  mintNft,
} from "../kycUtils";
import {
  getAuth,
  onAuthStateChanged,
  connectAuthEmulator,
  User,
  signInWithCustomToken,
  UserCredential,
  Auth,
} from "firebase/auth";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { TokenDisplay } from "./tokenDisplayComponent";
export interface VerifyProps {
  fireApp: FirebaseApp;
}

export const VerifyComponent = (props: VerifyProps) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [user, setUser] = useState<User | undefined>();
  const [creds, setCreds] = useState<UserCredential | undefined>();
  const [devMode, setDevMode] = useState<boolean>(false);
  const [auth, setAuth] = useState<Auth | undefined>();

  useEffect(() => {
    if (props.fireApp === undefined) {
      return;
    }
    if (auth !== undefined) {
      return;
    }
    setAccountsState();
    const newAuth = getAuth();
    setAuth(newAuth);
    if (CheckAndInitDevMode(props.fireApp)) {
      setDevMode(true);
    }
    const db = getFirestore(props.fireApp);
    onAuthStateChanged(newAuth, (user) => {
      setUser(user as User);
      setLoggedIn(user?.uid !== undefined);
    });

    return () => {};
  },[props.fireApp,auth]);

  if (props.fireApp === undefined) {
    return <></>;
  }

  function renderMintNFT(){
    if(!loggedIn){
      return <></>
    }
    return (
      <div>
        <button className="bg-green-700 text-white" onClick={() => mintNft(user?.uid || '', props.fireApp)}>
          MINT NFT
        </button>
      </div>
    );
  }
  function renderLoggedIn() {
    return (
      <>
        <div>{devMode === true ? "DEV MODE" : ""}</div>
        <div className={"m-2 truncate w-60  " + (loggedIn? " text-green-400" : "")}>
          Logged in: {loggedIn.toString().toUpperCase()}
          <label className="m-2">{user?.uid}</label>
        </div>
        <div>
          <button onClick={() => auth?.signOut()}>
            {loggedIn ? "Sign Out" : ""}
          </button>
        </div>
      </>
    );
  }

  async function getAccounts(){
      const prov = getProvider();
      const newaccounts = await prov.send("eth_requestAccounts", []);
      return newaccounts;
  }
  async function setAccountsState(){
      const newaccounts = await getAccounts();
      setAccounts(newaccounts);
  }
  const connect = async () => {
    try {
      if (auth=== undefined) {
        console.info("no auth");
        return;
      }
      if(accounts ===undefined){
        return;
      }

      const nonce = await getNonceForAddress(accounts[0]);
      console.log("nonce", nonce);
      const json = await nonce.json();
      console.log("json", JSON.stringify(json));

      const prov = getProvider();
      const accountSig = await prov.getSigner().signMessage(json.nonce);
      console.log(accountSig);
      const recovered = ethers.utils.verifyMessage(json.nonce, accountSig);
      if (recovered.toLowerCase() !== accounts[0].toLowerCase()) {
        alert(recovered + "\n" + accounts[0]);
        return;
      }

      const verifyResponse = await verifyAddressSig(accounts[0], accountSig);
      console.log("verifyresponse", verifyResponse);
      const verifyjson = await verifyResponse.json();
      console.log("verifyjson", JSON.stringify(verifyjson));
      if (verifyjson.status === "success") {
        console.dir(verifyjson);
        const cred = await signInWithCustomToken(auth, verifyjson.customToken);
        setCreds(cred);
      }
    } catch (error) {
      console.error(error);
    }
  };
  const renderSignIn = () => {
    if (loggedIn) {
      return <></>;
    }
    return (
      <div>
        <button
          onClick={() => connect()}
          className="rounded bg-gray-50 text-black p-2"
        >
          Sign in with Metamask
        </button>
      </div>
    );
  };
  const renderVerification = () => {
    if (!loggedIn) {
      return <></>;
    }
    return (
      // <a href="#" onClick={() => startVerification(props.fireApp)} className="">
      <div className="rounded border-blue-500 bg-green-800 p-2">
        <a
          href="#"
          onClick={() => startVerification(props.fireApp)}
          className=""
        >
          <h2>Verify Your Identity &rarr;</h2>
          <p>
            You will need a government ID or passport, and access to a camera.
          </p>
        </a>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center rounded bg-gray-50 p-2">
      {renderLoggedIn()}
      {renderSignIn()}
      {renderVerification()}
      {renderMintNFT()}
      <p className={styles.description}>
        Once verified, you can mint a special non transferrable NFT by Legato
        that allows you to use the system without needing to verify again.
      </p>
      <TokenDisplay accountAddress={accounts[0]} app={props.fireApp} uid={user?.uid || ''} />
    </div>
  );
};

export default VerifyComponent;


function getProvider() {
  return new ethers.providers.Web3Provider((window as any).ethereum);
}

