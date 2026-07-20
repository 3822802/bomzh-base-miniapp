import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { facilitator } from "@coinbase/x402";
import { privateKeyToAccount } from "viem/accounts";
import { isAddress, type Hex } from "viem";
import {
  OWNER_ADDRESS,
  SPIN_PRICE_USDC,
  BASE_CHAIN_ID,
  CONTRACTS,
} from "@/lib/constants";

// x402 + CDP-фасилитатор требуют Node-рантайм (не Edge).
export const runtime = "nodejs";

// ── x402-гейт: оплата $0.02 USDC на Base, получатель — кошелёк владельца ──
// Фасилитатор Coinbase (mainnet) читает CDP_API_KEY_ID / CDP_API_KEY_SECRET из env.
// ⚠️ Требует боевой проверки с CDP-ключами + реальным USDC перед продом.
const server = new x402ResourceServer(
  new HTTPFacilitatorClient(facilitator)
).register("eip155:8453", new ExactEvmScheme());

// 4 тира, веса шанса выпадения (tier 1..4). Один выпадает за спин.
const TIER_WEIGHTS = [60, 25, 12, 3] as const;

function cryptoRandomTier(): number {
  const total = TIER_WEIGHTS.reduce((a, b) => a + b, 0);
  const r = crypto.getRandomValues(new Uint32Array(1))[0] % total;
  let acc = 0;
  for (let i = 0; i < TIER_WEIGHTS.length; i++) {
    acc += TIER_WEIGHTS[i];
    if (r < acc) return i + 1;
  }
  return TIER_WEIGHTS.length;
}

function cryptoRandomNonce(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return n;
}

// Хендлер выполняется ТОЛЬКО после проверки оплаты x402 → выдаём ваучер.
async function handler(req: NextRequest): Promise<NextResponse> {
  const player = req.nextUrl.searchParams.get("player");
  if (!player || !isAddress(player)) {
    return NextResponse.json(
      { error: "query param ?player=0x... required" },
      { status: 400 }
    );
  }

  const signerKey = process.env.SPIN_SIGNER_PRIVATE_KEY as Hex | undefined;
  const roulette = CONTRACTS.roulette;
  if (!signerKey || !roulette) {
    return NextResponse.json(
      {
        error:
          "server not configured (SPIN_SIGNER_PRIVATE_KEY / CONTRACTS.roulette)",
      },
      { status: 503 }
    );
  }

  const account = privateKeyToAccount(signerKey);
  const tier = cryptoRandomTier();
  const nonce = cryptoRandomNonce();

  // EIP-712 ваучер — домен ДОЛЖЕН совпадать с BomzhRoulette (name/version/chainId/contract).
  const signature = await account.signTypedData({
    domain: {
      name: "BomzhRoulette",
      version: "1",
      chainId: BASE_CHAIN_ID,
      verifyingContract: roulette as `0x${string}`,
    },
    types: {
      Spin: [
        { name: "player", type: "address" },
        { name: "tier", type: "uint8" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "Spin",
    message: { player: player as `0x${string}`, tier, nonce },
  });

  return NextResponse.json({ tier, nonce: nonce.toString(), signature });
}

export const GET = withX402(
  handler,
  {
    accepts: {
      scheme: "exact",
      price: `$${SPIN_PRICE_USDC}`,
      network: "eip155:8453",
      payTo: OWNER_ADDRESS,
    },
    description: "Bomzh рулетка — один спин",
  },
  server,
  undefined, // paywallConfig
  undefined, // paywall
  false // syncFacilitatorOnStart: откладываем до первого запроса (нужны CDP-ключи)
);
