import { ethers, BigNumber } from "ethers";
import { FirebaseApp } from "firebase/app";
import { useEffect, useState } from "react";
import { burnNft } from "../kycUtils";

export interface ITokenDisplayProps {
  accountAddress: string;
  uid: string;
  app: FirebaseApp;
}
export interface ITokenChainInfo {
  address: string;
  hasToken: boolean;
  tokenId: number;
}
export function TokenDisplay(props: ITokenDisplayProps) {
  const [details, setDetails] = useState<ITokenChainInfo>({
    address: "",
    hasToken: false,
    tokenId: 0,
  });

  useEffect(() => {
    async function check() {
      try {
        console.log("checking...");
        if (!ethers.utils.isAddress(props.accountAddress)) {
          return;
        }
        console.log(props.accountAddress);
        const prov = new ethers.providers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_NODE_URL
        );
        const contract = new ethers.Contract(
          process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "",
          ["function balanceOf(address who) public view returns (uint256)"],
          prov
        );
        const result = await contract.balanceOf(props.accountAddress);
        const numResult = BigNumber.from(result).toNumber();
        console.log("balanceof:", props.accountAddress, " -> ", numResult);
        setDetails({
          address: contract.address,
          hasToken: numResult === 1,
          tokenId: 0,
        });
      } catch (error) {
        console.error(error);
      }
    }
    try {
      check();
    } catch (error) {
      console.error(error);
    }
    return () => {};
  }, [props.accountAddress]);

  function renderBurnButton() {
    if (!details.hasToken) {
      return <></>;
    }
    return (
      <div>
        <button
          onClick={() => burnNft(props.uid, props.app)}
          className="text-red p-2 rounded bg-gray-50"
        >
          Burn My ID Token
        </button>
      </div>
    );
  }
  const eu = ethers.utils;
  if (!eu.isAddress(props.accountAddress)) {
    return (
      <div className="text-red rounded bg-black p-2">
        Token address not configured.
      </div>
    );
  }
  return (
    <div>
      <div>ID Registered: {details.hasToken.toString()}</div>
      <div>ID number: {details.tokenId.toString()}</div>
      <div>ID Address: {details.address.toString()}</div>
      {renderBurnButton()}
    </div>
  );
}
