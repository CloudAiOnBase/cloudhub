'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useChainId, usePublicClient } from 'wagmi';
import { formatUnits }    from 'viem';
import tokenAbi           from '@/abi/CloudToken.json';
import identityAbi        from '@/abi/CloudIdentity.json';
import stakingAbi         from '@/abi/CloudStaking.json';
import { CONTRACTS }      from '@/constants/contracts';
import { X }              from 'lucide-react';
import { toast }          from 'react-hot-toast';
import MintCloudPassForm  from '@/components/MintCloudPassForm';

type StakerInfo = [
  bigint, // stakedAmount
  bigint, // lastRewardClaimTime
  bigint, // unstakingAmount
  bigint, // unstakingStartTime
  bigint, // totalEarnedRewards
  bigint, // lastActivityTime
  boolean // isActive
];

export default function IdentityPage() {
  const { address, isConnected }          = useAccount();
  const { writeContractAsync }            = useWriteContract();
  const [avatarUrl, setAvatarUrl]         = useState('');
  const [profileData, setProfileData]     = useState('');
  const [avatarFile, setAvatarFile]       = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoaded, setAvatarLoaded]   = useState(false);
  const [avatarError, setAvatarError]     = useState<string | null>(null);


  const chainId         = useChainId();
  type ChainId          = keyof typeof CONTRACTS.STAKING_ADDRESSES;
  const identityAddress = CONTRACTS.IDENTITY_ADDRESSES[chainId as ChainId];
  const stakingAddress  = CONTRACTS.STAKING_ADDRESSES[chainId as ChainId];
  const tokenAddress    = CONTRACTS.TOKEN_ADDRESSES[chainId as ChainId];
  const publicClient    = usePublicClient();

  // ==========================
  // Helpers
  // ==========================

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

  // ==========================
  // Params
  // ==========================

  const minStakeResult  = useReadContract({
    address: identityAddress as `0x${string}`,
    abi: identityAbi,
    functionName: 'minStakeRequired',
  });

console.log(minStakeResult?.data);

  // ==========================
  // userHasPass ?
  // ==========================

  const {
    data: tokenId,
    refetch: refetchUserHasPass,
    isLoading: loadingTokenId,
  } = useReadContract({
    address: identityAddress as `0x${string}`,
    abi: identityAbi,
    functionName: 'tokenIdByOwner',
    args: [address],
    query: {enabled: isConnected },
  });

  const userHasPass =
  tokenId !== undefined && BigInt(tokenId as bigint) !== 0n;

  // ==========================
  // show pass
  // ==========================


  const {
    data: stakingRaw,
    isLoading: loadingStake,
    isError: errorStake,
    refetch: refetchStake,
  } = useReadContract({
    address: stakingAddress as `0x${string}`,
    abi: stakingAbi,
    functionName: 'stakers',
    args: [address],
    query: { enabled: !!address },
  });

  const stakingData         = stakingRaw as StakerInfo | undefined;
  const stakedAmount        = stakingData?.[0] ?? 0n;
  const minStakeRequired    = ((minStakeResult?.data as bigint) ?? 0n) * 10n ** 18n;
  const hasEnoughStake      = (stakedAmount as bigint) >= minStakeRequired;


  console.log(stakedAmount);


  const { data: username } = useReadContract({
    address: identityAddress as `0x${string}`,
    abi: identityAbi,
    functionName: 'getUsername',
    args: [tokenId],
    query: {
      enabled: Boolean(tokenId),
    }
  });

  const { data: mintTimestamp } = useReadContract({
    address: identityAddress as `0x${string}`,
    abi: identityAbi,
    functionName: 'tokenBirth',
    args: [tokenId],
    query: {
      enabled: Boolean(tokenId),
    }
  });

  const { data: tokenUri } = useReadContract({
    address: identityAddress as `0x${string}`,
    abi: identityAbi,
    functionName: 'tokenURI',
    args: [tokenId],
    query: {
      enabled: Boolean(tokenId),
    }
  });

  useEffect(() => {
    if (!tokenUri) return;

    // Replace ipfs.io with lighthouse gateway
   const gatewayTokenUri = (tokenUri as string).replace(
    'https://ipfs.io',
    'https://gateway.lighthouse.storage'
  );


    fetch(gatewayTokenUri)
      .then(res => res.json())
      .then(data => {
        // Replace ipfs.io in image URL as well (if needed)
        const gatewayImage = data.image?.replace('https://ipfs.io', 'https://gateway.lighthouse.storage');
        setAvatarUrl(gatewayImage);
        // setProfileData(data.description); // optional bio
      })
      .catch(err => console.error('Error loading metadata:', err));
  }, [tokenUri]);


  // ==========================
  // Avatar
  // ==========================

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 1 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Only JPG, PNG, WEBP, or GIF files are allowed.');
      return;
    }

    if (file.size > maxSize) {
      setAvatarError('Image must be less than 1MB.');
      return;
    }

    const img = new Image();
    img.onload = () => {
      const isSquare = img.width === img.height;
      const isLargeEnough = img.width >= 400 && img.height >= 400;

      if (!isSquare) {
        setAvatarError('Image must be square (1:1 aspect ratio).');
        return;
      }

      if (!isLargeEnough) {
        setAvatarError('Image must be at least 400x400 pixels.');
        return;
      }

      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    };

    img.onerror = () => {
      setAvatarError('Invalid image file.');
    };

    img.src = URL.createObjectURL(file);
  }

  async function uploadToIPFS(file: File, filePath: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filePath', filePath); // exact filename (e.g. avatar4.jpg)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.ipfsUrl;
  }

  // ==========================
  // Views
  // ==========================

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center text-gray-600">
        <p className="mt-2">Connect your wallet to view or mint your CloudPass.</p>
      </div>
    );
  }

  if (loadingTokenId) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center text-gray-600">
        <p className="mt-2">Checking CloudPass status...</p>
      </div>
    );
  }


  if (userHasPass) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-6 text-gray-900">
        <h1 className="text-3xl font-bold text-center">Your CloudPass</h1>

          <div
          className="relative flex items-center gap-6 border border-gray-300 shadow-lg rounded-xl p-8 overflow-hidden bg-white"
          style={{
            backgroundImage: `url('/cloudai-watermark.svg')`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right bottom',
            backgroundSize: '150px',
          }}
        >

         {/* Blurred blobs */}
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-purple-300 opacity-30 rounded-full blur-2xl"></div>
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-indigo-200 opacity-30 rounded-full blur-2xl"></div>

           {tokenId && (
            <span className="absolute bottom-5 right-5 text-xs text-purple-700 font-mono opacity-70 z-20">
             #{(tokenId as bigint).toString()}
            </span>
          )}
            <div className="flex flex-col items-center gap-1 z-10">
          {avatarUrl && !avatarError ? (

              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-28 h-28 rounded-full border object-cover z-10"
                onLoad={() => setAvatarLoaded(true)}
                onError={() => setAvatarError('Failed to load avatar image.')}
              />


          ) : (
            <div className="w-28 h-28 rounded-full border flex items-center justify-center bg-gray-100 text-gray-400 z-10 text-sm">
              {avatarError ? '❌ Failed' : '⏳ Loading...'}
            </div>
          )}

              <button
                onClick={() => toast('🚧 Coming soon')}
                className="text-xs text-blue-500 underline hover:text-blue-600 transition"
              >
               Edit Avatar
              </button>
              </div>

          <div className="flex flex-col justify-center space-y-1 z-10">
            <p className="text-lg font-semibold">
              <span className="text-gray-500"></span> {username as string}
            </p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {profileData || 'No bio set.'}
            </p>
            <p className="text-sm text-gray-500">
              <strong>Issued:</strong>{' '}
              {mintTimestamp ? new Date(Number(mintTimestamp) * 1000).getFullYear() : 'Loading...'}
            </p>
          </div>

          <span
            className={`mt-1 inline-block text-xs font-bold tracking-widest font-mono px-2 py-0.5 rounded ${
              hasEnoughStake
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
            }`}
          >
            {hasEnoughStake ? 'VALID' : 'INACTIVE'}
          </span>
          
        </div>

        {!hasEnoughStake && (
          <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded mt-3">
            ⚠️ Your CloudPass is currently <strong>inactive</strong>. Stake at least{' '}
            <strong>{format(minStakeRequired)}</strong> CLOUD to activate it.
          </div>
        )}

      </div>
    );
  }

  return (
    <MintCloudPassForm onMintSuccess={refetchUserHasPass} />
  );

}
