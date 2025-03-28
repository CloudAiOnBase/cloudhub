import { useReadContract } from 'wagmi';
import tokenAbi from '@/abi/CloudToken.json';
import { CONTRACTS } from '@/constants/contracts';

export function useAllowanceCheck(user: string | undefined, spender: string, amount: bigint, chainId: number) {
  const { data: allowance, isLoading } = useReadContract({
    abi: tokenAbi,
    address: CONTRACTS.TOKEN_ADDRESSES[chainId],
    functionName: 'allowance',
    args: [user, spender],
    query: {
      enabled: !!user && !!spender,
    },
  });

  const isEnough = allowance !== undefined && allowance >= amount;

  return { allowance, isEnough, isLoading };
}

