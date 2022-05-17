//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma experimental "ABIEncoderV2";

import {ECDSA} from  "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

contract MultiSigVault {
    struct WithdrawalInfo {
        uint256 amount;
        address to;
    }

    string constant private MSG_PREFIX = "\x19Ethereum Signed Message:\n32";

    uint256 public nonce;
    mapping(address => bool) private _isValidSigner;
    uint private _threshold;

    bool private _lock;

    modifier nonReentrant() {
        require(!_lock);
        _lock = true;
        _;
        _lock = false;
    }


    constructor(address[] memory _signers ) {
        _threshold = _signers.length;
        for (uint i=0; i < _threshold; i++) {
            _isValidSigner[_signers[i]] = true;
        }
    }

    receive() external payable {}

    /**
     * encode struct -> encodePacked with nonce -> digest 
     *   -> append ETH signed msg -> digest Out
     */
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

    function _transferETH (
        WithdrawalInfo calldata _txn
    )
    private
    {
        (bool success, ) = payable(_txn.to).call{value: _txn.amount }("");
        require(success, "Transfer not fulfilled");
    }

    function _verifyMultiSignature(
        WithdrawalInfo calldata _txn,
        uint256 _nonce,
        bytes[] calldata _multiSignature
    )
    private
    {
        require(_nonce > nonce, "nonce already used");
        uint256 count = _multiSignature.length;
        require(count >= _threshold, "not enough singers");
        bytes32 digest = _processWithdrawalInfo(_txn, _nonce);

        address initSignerAddress; 
        for (uint256 i = 0; i < count; i++)
        {
            address signerAddress = ECDSA.recover(digest, _multiSignature[i]);
            require( signerAddress > initSignerAddress, "possible duplicate" );
            require(_isValidSigner[signerAddress], "not part of consortium");
            initSignerAddress = signerAddress;
        }
        nonce = _nonce;
    }

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
}