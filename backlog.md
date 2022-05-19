## Roadblocks
- How to encode structs properly in typescript
```
ethers.utils.defaultAbiCoder.encode(["tuple(string)"],  [[txn.message]]);
```
- ECDSA recovery does not recover the right address singed by `wallet.signMessage`
  - because you need to preappend a string before digest being recovered
```
x = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", x));
```
  - Note that 32 represents size of digest

## article
- remember in smart contracts you need to remember to look further and code safe
### Notes
- Not the right way to implement nonce 
  - it can be attacked by making a transaction with max uint hence stopping the contract
- https://geth.ethereum.org/docs/rpc/ns-personal#personal_sign 
