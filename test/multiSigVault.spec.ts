import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import {MultiSigVault} from "../typechain/MultiSigVault";
import {ether} from "../utils/unitsUtils";

describe("MultiSigVault", function () {
    let subjectContract: MultiSigVault;
    let bob: SignerWithAddress;
    let getNextNonce = async () => (await subjectContract.nonce()).add(1);
    let getDigest = async (
        nonce: BigNumber,
        amount: BigNumber,
        to: string
    ) => {
      let txn = {amount, to};
      let encoded = ethers.utils.defaultAbiCoder.encode(["tuple(uint256,address)"],  [[txn.amount, txn.to]]);
      let encodedWithNonce = ethers.utils.solidityPack(["bytes", "uint256"], [encoded, nonce]);

      let digest= ethers.utils.keccak256(encodedWithNonce);
      return digest;
    }
    let subjectMethod = async (
        signer: SignerWithAddress,
        nonce: BigNumber,
        amount: BigNumber,
        to: string,
        signatures: string[]
    ) => {
        let txn = {amount, to};
        await subjectContract.connect(signer).execute( txn, nonce, signatures);
    }

    beforeEach ("", async function () {
        bob = (await ethers.getSigners())[0];
        
        subjectContract = await (await ethers.getContractFactory(
            "MultiSigVault"
            )).deploy([bob.address]);
        await subjectContract.deployed();
    });
  it("", async function () {
      let amount = ether(1);
      let nonce = await getNextNonce();
      let digest = await getDigest(nonce, ether(1), bob.address);
      console.log(digest);
      let signature = await bob.signMessage (ethers.utils.arrayify(digest)) ;


      console.log(signature);
      console.log(bob.address);
      console.log("executing ----");
      await subjectMethod(bob, nonce, amount, bob.address, [signature, signature]);
  });
});

