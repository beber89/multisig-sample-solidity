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
  it("Normal expected operation of contract", async function () {
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

  describe("", async function(){
    it("Normal expected operation of contract", async function () {
        let amount = ether(1);
        await funder.sendTransaction({value: amount, to: subjectContract.address});
        let nonce = await getNextNonce();
        let digest = await getDigest(nonce, amount, bob.address);

        let signers = [ bob, bob, bob];
        let signatures = [];
        for (let signer of signers) {
            let sign = await signer.signMessage (ethers.utils.arrayify(digest)) ;
            signatures.push(sign);
        }

        await expect(subjectMethod(bob, nonce, amount, bob.address, signatures)).to.be.revertedWith("possible duplicate");
    });

    it("revert - not enough singers", async function () {
        let amount = ether(1);
        await funder.sendTransaction({value: amount, to: subjectContract.address});
        let nonce = await getNextNonce();
        let digest = await getDigest(nonce, amount, bob.address);

        let signers = [ bob, alice];
        signers.sort((x, y) => x.address > y.address? 1: -1);
        let signatures = [];
        for (let signer of signers) {
            let sign = await signer.signMessage (ethers.utils.arrayify(digest)) ;
            signatures.push(sign);
        }

        await expect(subjectMethod(bob, nonce, amount, bob.address, signatures)).to.be.revertedWith("not enough signers");
    });

    it("revert - signer is not registered", async function () {
        let amount = ether(1);
        await funder.sendTransaction({value: amount, to: subjectContract.address});
        let nonce = await getNextNonce();
        let digest = await getDigest(nonce, amount, bob.address);

        let signers = [ bob, funder, alice];   // funder is not part of consortium
        signers.sort((x, y) => x.address > y.address? 1: -1);
        let signatures = [];
        for (let signer of signers) {
            let sign = await signer.signMessage (ethers.utils.arrayify(digest)) ;
            signatures.push(sign);
        }

        await expect(subjectMethod(bob, nonce, amount, bob.address, signatures)).to.be.revertedWith("not part of consortium");
    });

    it("revert - unordered signers", async function () {
        let amount = ether(1);
        await funder.sendTransaction({value: amount, to: subjectContract.address});
        let nonce = await getNextNonce();
        let digest = await getDigest(nonce, amount, bob.address);

        let signers = [ bob, carol, alice];   
        signers.sort((x, y) => x.address > y.address? 1: -1);
        // swap last 2 to ensure unordered list
        let tmp = signers[2];   signers[2] = signers[1];
        signers[1] = tmp;


        let signatures = [];
        for (let signer of signers) {
            let sign = await signer.signMessage (ethers.utils.arrayify(digest)) ;
            signatures.push(sign);
        }

        await expect(subjectMethod(bob, nonce, amount, bob.address, signatures)).to.be.revertedWith("possible duplicate");
    });

    it("revert - not enough balance ", async function () {
        let amount = ether(1);
        await funder.sendTransaction({value: amount.sub(1), to: subjectContract.address});
        let nonce = await getNextNonce();
        let digest = await getDigest(nonce, amount, bob.address);

        let signers = [ bob, carol, alice ];   
        signers.sort((x, y) => x.address > y.address? 1: -1);

        let signatures = [];
        for (let signer of signers) {
            let sign = await signer.signMessage (ethers.utils.arrayify(digest)) ;
            signatures.push(sign);
        }

        await expect(subjectMethod(bob, nonce, amount,  bob.address, signatures)).to.be.revertedWith("Transfer not fulfilled");
    });

    it("revert - nonce not incremented ", async function () {
        let amount = ether(1);
        await funder.sendTransaction({value: amount.mul(2), to: subjectContract.address});
        let nonce = await getNextNonce();
        let digest = await getDigest(nonce, amount, bob.address);

        let signers = [ bob, carol, alice ];   
        signers.sort((x, y) => x.address > y.address? 1: -1);

        let signatures = [];
        for (let signer of signers) {
            let sign = await signer.signMessage (ethers.utils.arrayify(digest)) ;
            signatures.push(sign);
        }
        await subjectMethod(bob, nonce, amount,  bob.address, signatures);


        digest = await getDigest(nonce, amount, bob.address);
        signatures = [];
        for (let signer of signers) {
            let sign = await signer.signMessage (ethers.utils.arrayify(digest)) ;
            signatures.push(sign);
        }
        await expect(subjectMethod(bob, nonce, amount,  bob.address, signatures)).to.be.revertedWith("nonce already used");

    });
  });
  // TODO verify nonReentrant
});

