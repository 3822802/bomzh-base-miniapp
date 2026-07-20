// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
// BomzhRoulette — контракт рулетки (4 тира). См. Фаза C, шаг 8.
//
// Схема (см. PROJECT_Bomzh_full.md ЧАСТЬ 0):
//  1) юзер платит x402 $0.02 USDC на эндпоинт /api/spin (получатель — владелец);
//  2) сервер определяет выпавший тир и выдаёт ПОДПИСАННЫЙ ваучер (EIP-712):
//     Spin(player, tier, nonce), подписанный serverSigner;
//  3) юзер зовёт spin(...) — контракт проверяет подпись и минтит NFT тира.
//
// serverSigner — ОТДЕЛЬНЫЙ дешёвый ключ ТОЛЬКО для подписи ваучеров,
// НЕ приватный ключ кошелька владельца. Утечка = максимум лишний минт, ротируется
// через setServerSigner. OpenZeppelin v5 тянется Remix'ом по npm-путям.
// ─────────────────────────────────────────────────────────────────────────────

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IBomzhNFT {
    function mint(address to, uint8 tier) external returns (uint256);
}

contract BomzhRoulette is EIP712, Ownable {
    IBomzhNFT public immutable nft;
    address public serverSigner;

    // защита от повторного использования ваучера (по дайджесту)
    mapping(bytes32 => bool) public usedVoucher;

    bytes32 private constant SPIN_TYPEHASH =
        keccak256("Spin(address player,uint8 tier,uint256 nonce)");

    event Spun(address indexed player, uint8 tier, uint256 tokenId, uint256 nonce);
    event ServerSignerUpdated(address indexed signer);

    error BadSignature();
    error VoucherUsed();
    error BadTier(uint8 tier);

    constructor(address owner_, address nft_, address serverSigner_)
        EIP712("BomzhRoulette", "1")
        Ownable(owner_)
    {
        nft = IBomzhNFT(nft_);
        serverSigner = serverSigner_;
    }

    /// @notice Сменить серверный ключ-подписант (ротация).
    function setServerSigner(address s) external onlyOwner {
        serverSigner = s;
        emit ServerSignerUpdated(s);
    }

    /// @notice Забрать выигрыш по ваучеру, выданному сервером после оплаты x402.
    /// Ваучер привязан к msg.sender — чужим воспользоваться нельзя.
    function spin(uint8 tier, uint256 nonce, bytes calldata signature)
        external
        returns (uint256 tokenId)
    {
        if (tier == 0 || tier > 4) revert BadTier(tier);

        bytes32 structHash =
            keccak256(abi.encode(SPIN_TYPEHASH, msg.sender, tier, nonce));
        bytes32 digest = _hashTypedDataV4(structHash);

        if (usedVoucher[digest]) revert VoucherUsed();
        if (ECDSA.recover(digest, signature) != serverSigner) revert BadSignature();

        usedVoucher[digest] = true;
        tokenId = nft.mint(msg.sender, tier);
        emit Spun(msg.sender, tier, tokenId, nonce);
    }

    /// @notice Домен EIP-712 — для сверки на сервере при подписи ваучера.
    function eip712Domain2()
        external
        view
        returns (bytes32 domainSeparator)
    {
        return _domainSeparatorV4();
    }
}
