'use client';

import { useEffect, useState } from "react";
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { CONTRACTS } from '@/constants/contracts';
import { formatUnits } from 'viem';
//import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import tokenAbi from '@/abi/CloudToken.json'; // ERC20 ABI
import utilsAbi from '@/abi/CloudUtils.json';
import stakingAbi from '@/abi/CloudStaking.json';

export default function DashboardPage() {
  const { address: userAddress } = useAccount();
  const chainId         = useChainId();
  type ChainId          = keyof typeof CONTRACTS.STAKING_ADDRESSES;
  const tokenAddress    = CONTRACTS.TOKEN_ADDRESSES[chainId as ChainId];
  const utilsAddress    = CONTRACTS.UTILS_ADDRESSES[chainId as ChainId];
  const stakingAddress  = CONTRACTS.STAKING_ADDRESSES[chainId as ChainId];
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setTick] = useState(0); // We don’t care about the value
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [cloudPriceData, setCloudPriceData] = useState<{
    priceUsd: number;
    priceChange24h: number;
  } | null>(null);
  const [holders, setHolders] = useState<number | null>(null);

  // Token price
  const fetchCloudPrice = async () => {
    try {
      const res = await fetch("https://api.dexscreener.com/latest/dex/search?q=" + tokenAddress);
      if (!res.ok) {
        console.warn("DEXScreener fetch failed:", res.status);
        return null;
      }
      const data = await res.json();
      const pair = data.pairs?.[0];
      if (!pair || !pair.priceUsd) {
        console.warn("No price data available");
        return null;
      }
      return {
        priceUsd: parseFloat(pair.priceUsd),
        priceChange24h: parseFloat(pair.priceChange.h24),
      };
    } catch (err) {
      console.error("Error fetching price:", err);
      return null;
    }
  };


  // APR (scaled by 100)
  const {
    data: aprE2,
    refetch: refetchApr,
  } = useReadContract({
    abi: stakingAbi,
    address: stakingAddress as `0x${string}`,
    functionName: 'getAprE2',
    query: {
      enabled: !!userAddress,
    },
  });

  // Total Staked
  const {
    data: totalStaked,
    refetch: refetchTotalStaked,
  } = useReadContract({
    abi: stakingAbi,
    address: stakingAddress as `0x${string}`,
    functionName: 'totalStaked',
    query: {
      enabled: !!userAddress,
    },
  });

  // Circulating Supply
  const {
    data: circSupply,
    refetch: refetchCircSupply,
  } = useReadContract({
    abi: utilsAbi,
    address: utilsAddress as `0x${string}`,
    functionName: 'getCirculatingSupply',
    query: {
      enabled: !!userAddress,
    },
  });

  // Total Supply
  const {
    data: totalSupply,
    refetch: refetchTotalSupply,
  } = useReadContract({
    abi: tokenAbi,
    address: tokenAddress as `0x${string}`,
    functionName: 'totalSupply',
    query: {
      enabled: !!userAddress,
    },
  });



  // Total stakers
  const {
    data: totalStakers,
    refetch: refetchTotalStakers,
  } = useReadContract({
    abi: stakingAbi,
    address: stakingAddress as `0x${string}`,
    functionName: 'totalStakers',
    query: {
      enabled: !!userAddress,
    },
  });

  // Holders
  const fetchHolders = () => {
    const cached        = localStorage.getItem('holders');
    const cachedTime    = localStorage.getItem('holdersUpdated');
    const now           = Date.now();
    const expired       = !cachedTime || now - Number(cachedTime) > 20 * 60 * 1000; // 20 min
    const parsedCached  = Number(cached);

    if (isNaN(parsedCached) || expired) {
      console.log('refetch holders count');
      fetch('/api/holders')
        .then(res  => res.json())
        .then(data => {
          if (typeof data.holders === 'number') {
            localStorage.setItem('holders',         data.holders.toString()); 
            localStorage.setItem('holdersUpdated',  now.toString());
            setHolders(data.holders);
          } else {
            console.warn('Invalid holders value from API:', data);
          }
        })
        .catch(err => {
          console.error('Error fetching holders:', err);
        });
    } else {
      setHolders(parsedCached);
    }
  };

  useEffect(() => {
    fetchHolders();
  }, []);

  //
  useEffect(() => {
    const fetchAll = () => {
      fetchCloudPrice().then(data => {
        setCloudPriceData(data);
        setLastUpdated(new Date());
      });
      
    // Refetch on-chain data
    refetchApr();
    refetchTotalStaked();
    refetchCircSupply();
    refetchTotalSupply();
    refetchTotalStakers();
    fetchHolders();
    };

    fetchAll(); // Initial fetch

    const interval = setInterval(fetchAll, 60000); // Refresh every 60s

    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1); // Trigger re-render every second
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getRelativeTime = (date: Date | null) => {
    if (!date) return 'Loading...';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return `Last update: ${seconds}s ago`;
    if (seconds < 3600) return `Last update: ${Math.floor(seconds / 60)}m ago`;
    return `Last update: ${Math.floor(seconds / 3600)}h ago`;
  };

  const format = (val?: bigint, decimals: number = 2) => {
    if (val === undefined) return '0';

    const num = Number(formatUnits(val, 18));

    if (Number.isInteger(num)) return Math.floor(num).toLocaleString();

    const factor = 10 ** decimals;
    const floored = Math.floor(num * factor) / factor;

    return floored.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">


      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-1">Token Price / 24h Change</h2>
        <p className="text-2xl font-bold text-gray-900 mt-2 flex items-baseline space-x-3">
          {cloudPriceData?.priceUsd !== undefined ? (
            <>
              <span>${cloudPriceData.priceUsd.toFixed(6)}</span>
              <span
                className={`text-xl font-bold ${
                  cloudPriceData.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                ({cloudPriceData.priceChange24h >= 0 ? '+' : ''}
                {cloudPriceData.priceChange24h.toFixed(2)}%)
              </span>
            </>
          ) : (
            <span className="text-base text-gray-500">No data</span>
          )}
        </p>
      </div>



      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-1">Market Cap / FDV</h2>
        <p className="text-2xl font-bold text-gray-900 mt-2">
          {cloudPriceData?.priceUsd && circSupply
            ? `$${(cloudPriceData.priceUsd * Number(formatUnits(circSupply as bigint, 18))).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })} / $${(cloudPriceData.priceUsd * 1_000_000_000).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}`
            : 'No data'}
        </p>
      </div>


      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-1">Circulating / Total Supply</h2>
        <p className="text-2xl font-bold text-gray-900 mt-2 flex items-baseline space-x-2">
          <span>
            {circSupply
              ? `${format(circSupply as bigint, 0)} / ${format(totalSupply as bigint, 0)}`
              : 'No data'}
          </span>
          <span className="text-base font-mono text-gray-500">CLOUD</span>
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-1">Stakers / Holders</h2>
        <p className="text-2xl font-bold text-gray-900 mt-2">
          {totalStakers ? totalStakers.toLocaleString() : '-'} /{' '}
          {typeof holders === 'number' && holders > 0 ? holders.toLocaleString() : '-'}
        </p>
      </div>


      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500 mb-1">Total Staked /  % Staked</h2>
        <p className="text-2xl font-bold text-gray-900 mt-2 flex items-baseline space-x-2">
          <span>{format(totalStaked as bigint, 0)}</span>
          <span className="text-base font-mono text-gray-500">CLOUD</span>
          {circSupply !== null && totalStaked !== null && (
            <span className="text-xl font-bold text-gray-900 mt-2 flex items-baseline space-x-2">
              ({((Number(totalStaked) / Number(circSupply)) * 100).toFixed(2)}%)
            </span>
          )}
        </p>
      </div>



      <div className="bg-white shadow rounded-lg p-4 flex flex-col justify-between">
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-1">💎 Staking APR</h2>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {aprE2 !== undefined && aprE2 !== null
              ? `${(Number(aprE2) / 100).toFixed(2)}%`
              : 'Loading...'}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Earn rewards by staking your tokens securely and passively.
          </p>
        </div>
        <button
          className="mt-4 inline-block text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          onClick={() => {
            window.location.href = '/staking';
          }}
        >
          Stake Now
        </button>
      </div>




      <p className="text-xs text-gray-500 mt-1">
        {getRelativeTime(lastUpdated)}
      </p>

    </div>
  );
}
