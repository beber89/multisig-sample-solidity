# Build a basic multisignature vault in solidity for Ethereum
Signatures are essential part of our dealings, we type our signatures on paper to acknowledge the statements written down. Mathematics took the concept of singatures and leveraged it by certain types of numbers. 
A piece of information (i.e. can be a transaction represented in numbers) accompanied by its signature implies that the signer ackowledges this piece of information since no one except the signer is supposed to produce that signature.

Signatures are produced by assymmetric cryptographic keys. Unlike symmetric cryptographic keys, they provide a pair of keys for one account, one is public key which is known to everybody in the network and the other is private key which should be considered a top secret by the holder of the account. Transaction information are signed by private key and recover the public key of the signer. This presents a proof that the identity  of the holder of that public key is acknowledging the aforementioned signed transaction. 

So get on board as this article shows how to implement a solidity smart contract which acts as a vault. The vault is only opened by multiple wallets. Consequently funds from inside the vault are withdrawn to one account  once the multiple parties holding the wallets agree to that (i.e. multi-party consensus).

![Picture of vault opened only by 4 keys](/assets/multikey-vault.png "4 keys needed to open this vault")

## Setup

This sample code is based on a hardhat [boilerplate](https://hardhat.org/guides/typescript.html) with typescript.  Smart contracts on EVMs are mostly implmented using solidity. Other scripts are needed to work around this solidity codebase to perform essential tasks like deployment and testing. Almost all implementations use either javascript or typescript for these tasks. And without going into debates I personally prefer typescript if setting up a project based on it becomes straight forward and fortunately hardhat is making that possible for us. Refer to this [link](https://hardhat.org/guides/typescript.html) if you like to start this sample from scratch, let's get started. 

### Variables and Types 
```java 
struct WithdrawalInfo {
    uint256 amount;
    address to;
}

string constant private MSG_PREFIX = "\x19Ethereum Signed Message:\n32";
mapping(address => bool) private _isValidSigner;
uint private _threshold;
uint256 public nonce;
```
- `WithdrawalInfo`: a type of the variable which represents the task to be performed by the caller on the contract.
  - **amount**: the quantity of ETH to be withdrawn in this transaction.
  - **to**: address of the account to receive the withdrawn amount.
- `MSG_PREFIX`: a string appended at the beginning of messages to be signed by the parties involved.
- `isValidSigner`: a hashmap that stores the addresses of the legitimate parties who can symbolically open our ETH vault.
- `_threshold`: refers to the minimum number of signers or parties need to be involved in the withdrawal call. In this sample code that number is the same as the number of parties registered in the contract (i.e. `isValidSigner`). A more general scheme M-of-N multisig can be implemented where N refers to the number of parties and M to the minimum number of parties required to be involved in the privileged calls.
- `nonce`: put to protect the contract from replay attacks.
### Constructor
```java
constructor(address[] memory _signers ) {
    _threshold = _signers.length;
    for (uint i=0; i < _threshold; i++) {
        _isValidSigner[_signers[i]] = true;
    }
}
```
Right at the moment of deployment the contract initiates the addresses of the legitimate parties `_signers` who are allowed to withdraw funds. Value of `_threshold` is accordingly set to the count of parties initially setting up this contract making it a sort of N-of-N rather than M-of-N multisig just for the sake of this example.
### Reentrancy protection 

```java
bool private _lock;
modifier nonReentrant() {
    require(!_lock);
    _lock = true;
    _;
    _lock = false;
}
```
This snippet is implemented in the contract to protect the main external function call from reentrancy attack. Attackers perform this type of nasty attack in order to steal funds from the contract. Despite that it might seem unnecessary to put this in our code sample; since we are not tracking balances here, nonetheless it is essential to throw that whenever we have to utilize withdrawal function calls.

### How to find the signer 

The following diagram shows a quick overview for the approach adopted in this writeup:

```

                                   +------------+--------------+
                                   | _txn       |     _nonce   |
                                   +------------+--------------+
                                         |               |
                                         +---------------+
                                                | keccak256
                         +------------+---------------+
                         | MSG_PREFIX |   _hash       |   
                         +------------+---------------+
                                |               |
                                +---------------+
                                        | keccak256
                                      +----------+         +--------------+
                                      | _digest  |         |  signature   |   
                                      +----------+         +--------------+                          
                                              |               |
                                              +---------------+
                                                       | ECDSA.recover 
                                                +---------------+
                                                | signerAddress |
                                                +---------------+
```
Starting from the top of the diagram, we have `_txn` which refers to both the amount of ETH to be withdrawn and the account receiving it. You can see `_nonce`  as a sequence number in which each call to the contract you have to increment that sequence number. It is worth noting that you will have a working code without nonce but you better not need to learn why it is important after the damage is done; as it protects our contract from replay attacks. For now, think of replay attack as cropping a signature from a paper then pasting it on another claiming that the owner of this signature acknowledges the terms in that other paper, hence introducing `_nonce` protects us from this sneaky vulnerability.

First, we hash `_txn` and `_nonce` packed together using `keccak256` function provided by solidity. Then we append that output `_hash` to `MSG_PREFIX` and hash them together again. The output of the second hash operation `_digest` is combined with `signature`, as together we can use them both to know the account public address of the signer `signerAddress` by utilizing some Maths magic. Fortunately, we do not have to get into the Mathematical details of how this is recovered since `ECDSA` library provided by [openzeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/ECDSA.sol) does that magic for us in the codebase of this example. Finally, after having `signerAddress`, it can be verified if he is a valid signer or not, from which if he is a legitimate signer we shall end up having one of the locks of this vault opened waiting for the rest of the parties to approve.

### Preprocess transaction
```java
function _processWithdrawalInfo(
    WithdrawalInfo calldata _txn,
    uint256 _nonce 
)
private 
pure
returns(bytes32 _digest)
{
    bytes memory encoded = abi.encode( _txn);
    _digest = keccak256(abi.encodePacked(encoded, _nonce));
    _digest = keccak256(abi.encodePacked(MSG_PREFIX, _digest));
}
```
First, we process the struct `WithdrawalInfo` appended with the `_nonce` in order to obtain `_digest` which is the data needed in order to be combined with the corresponding signature.

### Verify Signatures
```java
function _verifyMultiSignature(
    WithdrawalInfo calldata _txn,
    uint256 _nonce,
    bytes[] calldata _multiSignature
)
private
{
    require(_nonce > nonce, "nonce already used");
    uint256 count = _multiSignature.length;
    require(count >= _threshold, "not enough signers");
    bytes32 digest = _processWithdrawalInfo(_txn, _nonce);

    address initSignerAddress; 
    for (uint256 i = 0; i < count; i++)
    {
        bytes memory signature = _multiSignature[i];
        address signerAddress = ECDSA.recover(digest, signature );
        require( signerAddress > initSignerAddress, "possible duplicate" );
        require(_isValidSigner[signerAddress], "not part of consortium");
        initSignerAddress = signerAddress;
    }
    nonce = _nonce;
}
```
Rightnow we arrive at the meat of this topic, the logic followed in order to verify the withdrawal operation. First, contract verifies that the `_nonce` is greater than the last used nonce. If that condition is missed, it implies that the signatures might have been compromised as the attacker can reuse them in this function call (think of the crop and paste analogy). After that it requires that the number of signatures should be greater than or equal to the threshold needed for the withdrawal to be achieved. Then we obtain the `digest` by executing the function discussed right before this one. Then a loop is run over the signatures to do the following:
- Recover `signerAddress` from `digest` and `signature` in the second line of the loop's body.
- Verify that `signerAddress` is greater than the previous one. This might seem subtle, the point here is to avoid duplicate signatures of the same digest. Imagine a scenario in which we need three signatures to withdraw the ETH and the caller have just passed one signature in an array repeated three times. This line verifies that this scenario does not take place in a computationally efficient way but it also requires from the caller's side to sort the signatures entered according to the address of the party signing each one.
- Verify the signer is one of the legitimate parties.
- Finally, update the last checked address as well as `nonce`.

### Transfer
```java
function _transferETH (
    WithdrawalInfo calldata _txn
)
private
{
    (bool success, ) = payable(_txn.to).call{value: _txn.amount }("");
    require(success, "Transfer not fulfilled");
}
```
This snippet transfers specified amount of ETH from the contract, acting as vault, to the account. It is vital to check the flag `success` since the contract transaction can still be valid even if `call` fails. Checking the flag will revert the transaction if the ETH transfer is not successful.

### Glue it all
```java
function withdrawETH(
    WithdrawalInfo calldata _txn,
    uint256 _nonce,
    bytes[] calldata _multiSignature 
)
external
nonReentrant
{
    _verifyMultiSignature(_txn, _nonce, _multiSignature);
    _transferETH(_txn);
}
```
This function is the one aimed at to be called by the external dapp. It combines both previously discussed functions. Modifier `nonReentrant`, explained [above](#reentrancy-protection), is applied on this function since this is where a malicious caller can get in and do the bad job.

## Time to interact

At this point it is time to get in to the action in order to get this all running. Dapps are written in order to interact with contracts deployed onto the blockchain. Most dapps are implemented via popular frontend frameworks implemented in javascript. Fortunately, this makes writing the interactions on the dapp not much different from the tests implemented in the hardhat project. Therefore, presenting the tests written in typescript suffices to show what we need to do in the frontend dapp.

```typescript
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
```
In this project `ethersjs` library is used since it provides us with utils and the means to interact with the deployed contracts in a neat way. This snippet of code does the same logic as [`_processWithdrawalInfo`](#preprocess-transaction), it produces `digest` which is later to be to be signed.
```typescript
let sign = await signer.signMessage (ethers.utils.arrayify(digest)) ;
```
`sign` is the signature of the digest produced by the wallet of `signer`.
Finally, `withdrawETH` is called to unlock the contract funds for the parties. `signatures` is an array of several `sign` variables produced by different signers' wallets.
```typescript
await subjectContract.connect(signer).withdrawETH( txn, nonce, signatures, {gasPrice: 0});
```

## Conclusion
Despite that Ethereum does not have mutlisig built in unlike Bitcoin network. The programmability of Ethereum enables us to write smart contracts that provides us with this feature. Refer to this [repo](https://github.com/beber89/multisig-sample-solidity) on github which includes the smart contract and the tests.

