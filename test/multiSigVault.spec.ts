import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import {MultiSigVault} from "../typechain/MultiSigVault";
import {ether} from "../utils/unitsUtils";

describe("MultiSigVault", function () {
    let subjectContract: MultiSigVault;
    let bob: SignerWithAddress;
    let alice: SignerWithAddress;
    let carol: SignerWithAddress;
    let funder: SignerWithAddress;
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
        await subjectContract.connect(signer).withdrawETH( txn, nonce, signatures, {gasPrice: 0});
    }

    beforeEach ("", async function () {
        let signers = await ethers.getSigners();
        [bob, alice, carol, funder, ] = signers;
        
        subjectContract = await (await ethers.getContractFactory(
            "MultiSigVault"
            )).deploy([alice.address, bob.address, carol.address ]);
        await subjectContract.deployed();
    });
  it("", async function () {
      let amount = ether(1);
      await funder.sendTransaction({value: amount, to: subjectContract.address});
      let nonce = await getNextNonce();
      let digest = await getDigest(nonce, amount, bob.address);

      let signers = [ bob, alice, carol];
      signers.sort((x, y) => x.address > y.address? 1: -1);
      let signatures = [];
      for (let signer of signers) {
          let sign = await signer.signMessage (ethers.utils.arrayify(digest)) ;
          signatures.push(sign);
      }

      let initBobETHBalance = await ethers.provider.getBalance(bob.address);
      await subjectMethod(bob, nonce, amount, bob.address, signatures);
      let finalBobETHBalance = await ethers.provider.getBalance(bob.address);

      expect(finalBobETHBalance.sub(initBobETHBalance)).to.be.eq(amount);
  });
  // Verify duplicate revert  
  // verify unsorted revert
  // verify threshold revert
  // verify no balance revert  
  // verify nonce revert
  // verify nonReentrant
});

