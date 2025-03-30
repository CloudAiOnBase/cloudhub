type ChainId = 8453 | 84532;

type ContractMap = Record<ChainId, `0x${string}`>;

export const CONTRACTS: {
  TOKEN_ADDRESSES: ContractMap;
  UTILS_ADDRESSES: ContractMap;
  STAKING_ADDRESSES: ContractMap;
  STAKE_VAULT_ADDRESSES: ContractMap;
  REWARD_POOL_ADDRESSES: ContractMap;
  GOVERNOR_ADDRESSES: ContractMap;
  DEV_FUND_ADDRESSES: ContractMap;
} = {
  TOKEN_ADDRESSES: {
    8453: '0x2425598dd959e47a294a737ee4104316864817cf',
    84532: '0x7742219d36b99faafe6ae9b0e1bbea5c03748e2d',
  },
  UTILS_ADDRESSES: {
    8453: '0xE8cb9703Dbb199e68906bD90048DF30d9b85D470',
    84532: '0xE8cb9703Dbb199e68906bD90048DF30d9b85D470',
  },
  STAKING_ADDRESSES: {
    8453: '0xB78c584ed07B1b0Bf8Bc6bdD48d32f31f599434d',
    84532: '0xB78c584ed07B1b0Bf8Bc6bdD48d32f31f599434d',
  },
  STAKE_VAULT_ADDRESSES: {
    8453: '0x67DBB32dFf2Ea28B5cBc26B51bB1A9FcdD2ebD0D',
    84532: '0x67DBB32dFf2Ea28B5cBc26B51bB1A9FcdD2ebD0D',
  },
  REWARD_POOL_ADDRESSES: {
    8453: '0xD4f13100463eCcFC5a40b83Cc9b28D02Feea624F',
    84532: '0xD4f13100463eCcFC5a40b83Cc9b28D02Feea624F',
  },
  GOVERNOR_ADDRESSES: {
    8453: '0xA98a85d920CDADa8C44dD3FD1D8139fdBcee3024',
    84532: '0x3047048052B67B98E8eEBeD1E92701c6BEC00d15',
  },
  DEV_FUND_ADDRESSES: {
    8453: '0x99857a25d4864193a103d8279865bEC00c099fD3',
    84532: '0xE47B74A9e57b8F42C5D8010834FA2Cc51251f5FF',
  },
};
