# Basic multisignature vault in solidity for Ethereum
## Overview
Signatures are essential part of our dealings, we type our signatures on paper to acknowledge the statements
written down. Mathematics took the concept of singatures and leveraged it by certain types of numbers. 
A piece of information (i.e. can be a transaction represented in numbers) accompanied by its signature implies that the signer ackowledges this piece of information since no one except the signer is supposed to produce that signature.

Signatures are produced by assymmetric cryptographic keys. Unlike symmetric cryptographic keys, they provide
a pair of keys for one account, one is public key which is known to everybody in the network and the other is
private key which should be considered a top secret by the holder of the account. Transaction information
are signed by private key and recover the public key of the signer. This presents a proof that the identity 
of the holder of that public key is acknowledging the aforementioned signed transaction. 

So get on board as this article shows how to implement a solidity smart contract which acts as a vault. The vault is only opened by multiple wallets. Consequently funds from inside the vault are withdrawn to one account 
once the multiple parties holding the wallets agree to that (i.e. multi-party consensus).

![Picture of vault opened only by 4 keys](/assets/multikey-vault.png "4 keys needed to open this vault")
## How to run
- Install dependencies
```
yarn install
```
- Run tests
```
yarn test
```