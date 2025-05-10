import { Abi } from 'viem';

const BASE_MAINNET_ID    = 8453;
const BASE_SEPOLIA_ID   = 84532;

const API_URLS: Record<number, string> = {
  [BASE_MAINNET_ID]:  'https://api.basescan.org/api',
  [BASE_SEPOLIA_ID]: 'https://api-sepolia.basescan.org/api',
};

const API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY!;

export async function fetchAbi(
  address: string,
  chainId: number
): Promise<Abi> {
  const apiUrl = API_URLS[chainId];
  if (!apiUrl) {
    throw new Error(`ABI fetch only supported on Base (chain ${BASE_MAINNET_ID} or ${BASE_SEPOLIA_ID})`);
  }

  const url = `${apiUrl
    }?module=contract
    &action=getabi
    &address=${address}
    &apikey=${API_KEY}`.replace(/\s+/g, '');

  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== '1') {
    throw new Error(`ABI not found on BaseScan: ${json.result || json.message}`);
  }
  return JSON.parse(json.result) as Abi;
}
