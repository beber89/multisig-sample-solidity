# Article
Signatures are essential part of our dealings, we type our signatures on paper to acknowledge the statements
written down. Mathematics took the concept of singatures and leveraged it by certain types of numbers. 
A piece of information (i.e. can be a transaction represented in numbers) accompanied by its signature implies that the signer ackowledges this piece of information since no one except the signer is supposed to produce that signature.

Signatures are produced by assymmetric cryptographic keys. Unlike symmetric cryptographic keys, they provide
a pair of keys for one account, one is public key which is known to everybody in the network and the other is
private key which should be considered a top secret by the holder of the account. Transaction information
are signed by private key and recover the public key of the signer. This presents a proof that the identity 
of the holder of that public key is acknowledging the aforementioned signed transaction. 

In the light of this, the article shows how to write a solidity smart contract which acts as a vault. The vault is only opened by multiple private keys, consequently funds from inside the vault are withdrawn to one account.

// picture of vault

## Setup
- hardhat / typescript boilerplate
- solidity  / version - if you're production then think carefully about version
- constructor
- variables 
- use ECDSA for the signature recovery magic (based on Maths)
```java
struct WithdrawalInfo {
    uint256 amount;
    address to;
}

string constant private MSG_PREFIX = "\x19Ethereum Signed Message:\n32";
uint256 public nonce;
mapping(address => bool) private _isValidSigner;
uint private _threshold;
```

<!-- nonce protects from replay - think of replay as cropping signature from a paper  -->
you will have a working code without nonce but you better not need to learn why it is important after it is too late

## Approach 
<!-- show picture -->
<!-- high level overview -->

## Preprocess transaction


## Recover


## Transfer


## Call to action
 typescript tests suffice to show what we need to do in the frontend dapp

## Conclusion

## Draft
### Hashing Map
```

                                   +------------+--------------+
                                   |  txn       |      nonce   |
                                   +------------+--------------+
                                         |               |
                                         +---------------+
                                                | keccak256
                         +------------+---------------+
                         | MSG_PREPAD |    digest     |   
                         +------------+---------------+
                                |               |
                                +---------------+
                                      | keccak256
                                      +----------+         +--------------+
                                      |  digest  |         |  signature   |   
                                      +----------+         +--------------+                          
                                              |               |
                                              +---------------+
                                                       | ECDSA.recover 
                                                +------------+
                                                | address    |
                                                +------------+
```

### Notes
- Not the right way to implement nonce 
  - it can be attacked by making a transaction with max uint hence stopping the contract
- https://geth.ethereum.org/docs/rpc/ns-personal#personal_sign 