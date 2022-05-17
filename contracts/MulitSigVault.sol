//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma experimental "ABIEncoderV2";

import {ECDSA} from  "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

contract MultiSigVault {
    struct Withdrawal {
        uint256 amount;
        address to;
    }

    string constant private MSG_PREPAD = "\x19Ethereum Signed Message:\n32";

    uint256 public nonce;
    mapping(address => bool) private _isValidSigner;
    uint private _threshold;


    constructor(address[] memory _signers) {
        _threshold = _signers.length;
        for (uint i=0; i < _threshold; i++) {
            _isValidSigner[_signers[i]] = true;
        }
    }

    /**
     * encode struct -> encodePacked with nonce -> digest 
     *   -> append ETH signed msg -> digest Out
     */
    function execute(
        Withdrawal memory _txn,
        uint256 _nonce,
        bytes[] memory _multiSignature 
    )
    external
    {
        require(_nonce > nonce, "nonce already used");
        bytes memory encoded = abi.encode( _txn);
        bytes32 digest = keccak256(abi.encodePacked(encoded, _nonce));
        console.logBytes32(digest);
        digest = keccak256(abi.encodePacked(MSG_PREPAD, digest));
        // (bytes memory signatures) = abi.decode(_multiSignature, (bytes));
        address caller = ECDSA.recover(digest, _multiSignature[0]);
        console.log(caller);
        nonce = _nonce;
    }
}