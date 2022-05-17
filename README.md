# Article


## Draft
### Hashing Map
+-----------------+--------------+
|  txn            |      nonce   |
+-----------------+--------------+
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

### Notes
- Not the right way to implement nonce 
  - it can be attacked by making a transaction with max uint hence stopping the contract