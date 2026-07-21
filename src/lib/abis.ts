// ABI собственных контрактов (минимально нужные фрагменты для фронта).

export const SALE_ABI = [
  { type: "function", name: "buy", stateMutability: "payable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "quote",
    stateMutability: "pure",
    inputs: [{ name: "ethWei", type: "uint256" }],
    outputs: [{ name: "tokensOut", type: "uint256" }],
  },
] as const;

// B20/ERC-20 совместимый минимум: баланс + approve для кормления.
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export const CARE_ABI = [
  { type: "function", name: "feed", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "feedCost",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "canFeed",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "stateOf",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "lastDay", type: "uint64" },
      { name: "streak", type: "uint32" },
      { name: "totalFeeds", type: "uint32" },
    ],
  },
] as const;

export const BADGE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;
