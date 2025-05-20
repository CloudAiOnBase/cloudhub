'use client';

import { useState, useEffect } 		from 'react';
import { useAccount, useReadContract, useWriteContract, useChainId, usePublicClient } from 'wagmi';
import { formatUnits } 				from 'viem';
import tokenAbi 					from '@/abi/CloudToken.json';
import identityAbi  				from '@/abi/CloudIdentity.json';
import stakingAbi 					from '@/abi/CloudStaking.json';
import { CONTRACTS } 				from '@/constants/contracts';
import { Check, AlertTriangle, X } 	from 'lucide-react';
import { toast } 					from 'react-hot-toast';
import { useAllowanceCheck } 		from '@/lib/hooks/useAllowanceCheck';

type StakerInfo = [
  bigint, // stakedAmount
  bigint, // lastRewardClaimTime
  bigint, // unstakingAmount
  bigint, // unstakingStartTime
  bigint, // totalEarnedRewards
  bigint, // lastActivityTime
  boolean // isActive
];

type Props = {
  onMintSuccess: () => void;
};

export default function MintCloudPassForm({ onMintSuccess }: Props) {
  const { address, isConnected }          			= useAccount();
  const { writeContractAsync }            			= useWriteContract();
  const [username, setUsername]           			= useState('');
  const [loading, setLoading]             			= useState(false);
  const [avatarFile, setAvatarFile]       			= useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] 			= useState<string | null>(null);
  const [avatarError, setAvatarError]     			= useState<string | null>(null);
  const [usernameError, setUsernameError] 			= useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] 	= useState<boolean | null>(null);
  const [debouncedUsername, setDebouncedUsername] 	= useState(username);
  const [allowanceBypassed, setAllowanceBypassed] 	= useState(false);

  const chainId 		= useChainId();
  type ChainId  		= keyof typeof CONTRACTS.STAKING_ADDRESSES;
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

  const mintPriceResult = useReadContract({
    address: identityAddress as `0x${string}`,
    abi: identityAbi,
    functionName: 'mintPrice',
  });
  const mintPriceInWei = mintPriceResult.data !== undefined  ? (mintPriceResult.data as bigint) * 10n ** 18n  : undefined;
  const minStakeResult  = useReadContract({
    address: identityAddress as `0x${string}`,
    abi: identityAbi,
    functionName: 'minStakeRequired',
  });

  // ==========================
  // user
  // ==========================

	const {
	  data: stakingRaw,
	} = useReadContract({
	  address: stakingAddress as `0x${string}`,
	  abi: stakingAbi,
	  functionName: 'stakers',
	  args: [address],
	  query: { enabled: !!address },
	});

	const stakingData = stakingRaw as StakerInfo | undefined;

  const stakedAmount            = stakingData?.[0] ?? 0n;
  const minStakeRequired 		= ((minStakeResult?.data as bigint) ?? 0n) * 10n ** 18n;
  const hasEnoughStake          = (stakedAmount as bigint) >= minStakeRequired;
  
  const { isEnough } 			= useAllowanceCheck(
    address,
    identityAddress,
    mintPriceInWei ?? 0n,
    chainId
  );

  // ==========================
  // Avatar
  // ==========================

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 1 * 1024 * 1024; // 1MB

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
  // Username
  // ==========================

  const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

  function validateUsername(name: string) {
    const isValid = USERNAME_REGEX.test(name);
    setUsernameError(isValid ? null : 'Username must be 3–20 characters and only include letters, numbers, - or _.');
    return isValid;
  }

  function isUsernameTaken(tokenId: unknown): boolean {
    return BigInt((tokenId ?? '0') as string) !== 0n;
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedUsername(username);
    }, 500);
    return () => clearTimeout(timeout);
  }, [username]);

	const {
	  data: rawTokenId,
	  isLoading,
	  isError,
	} = useReadContract({
	  address: identityAddress as `0x${string}`,
	  abi: identityAbi,
	  functionName: 'tokenIdByUsernameLower',
	  args: [debouncedUsername?.toLowerCase() ?? ''],
	  query: {
        enabled: !!debouncedUsername && usernameError === null,
  	  },
	});

  useEffect(() => {
    if (usernameError || !debouncedUsername) {
      setUsernameAvailable(null);
      return;
    }

    if (rawTokenId !== undefined && debouncedUsername === username) {
      const taken = isUsernameTaken(rawTokenId);
      setUsernameAvailable(!taken);
      setUsernameError(taken ? 'Username already taken.' : null);
    }
  }, [rawTokenId, usernameError, debouncedUsername, username]);

console.log(rawTokenId);

  // ==========================
  // Mint
  // ==========================

  async function checkUsernameTaken(name: string): Promise<boolean | null> {
    try {

      if (!publicClient) throw new Error('Public client not available');

      const tokenId = await publicClient.readContract({
        address: identityAddress,
        abi: identityAbi,
        functionName: 'tokenIdByUsernameLower',
        args: [name.toLowerCase()],
      });

      return BigInt(tokenId as string) !== 0n;
    } catch (err) {
      console.error('Error checking username:', err);
      return null; // null means "could not check"
    }
  }

  const toastId = 'minting-toast';

  async function mint() {
    if (!validateUsername(username)) return;

    if (!avatarFile) {
      setAvatarError('You need to upload an avatar image.');
      return;
    }

    setLoading(true);
    setAvatarError(null);

    try {
      const taken = await checkUsernameTaken(username);
      if (taken) throw new Error('Username already taken.');

      // Step 0: Approve if needed
      if (!isEnough && !allowanceBypassed) {

        toast.loading('Approving CLOUD...', { id: toastId });

        const tx0 = await writeContractAsync({
          address: tokenAddress as `0x${string}`,
          abi: tokenAbi,
          functionName: 'approve',
          args: [identityAddress, mintPriceInWei],
        });

        if (!publicClient) return;
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx0 });
        if (receipt.status !== 'success') throw new Error('Transaction failed');
        setAllowanceBypassed(true);
      }

      // Step 1: Mint with default metadata
      const defaultTokenUri = "https://files.lighthouse.storage/viewFile/bafkreiganyawrtrdqociinrsxhlkbb5fd6eypwatihsump27wgdyk2zv7a";

      toast.loading('Minting...', { id: toastId }); 

      const tx1 = await writeContractAsync({
        address: identityAddress as `0x${string}`,
        abi: identityAbi,
        functionName: 'mint',
        args: [username, defaultTokenUri],
      });
  
  	  if (!publicClient) return;
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx1 });
      if (receipt.status !== 'success') throw new Error('Transaction failed');

      // Show confirmation toast immediately after mint
      toast.success(
        <>
          Transaction confirmed! <br />
          Your CloudPass has been minted.
        </>,
        { id: toastId }
      );

      try {

        await new Promise(resolve => setTimeout(resolve, 2000)); // wait ~2s

        // Step 2: Get tokenId
        if (!publicClient) return;
        const tokenId = await publicClient.readContract({
          address: identityAddress,
          abi: identityAbi,
          functionName: 'tokenIdByUsernameLower',
          args: [username.toLowerCase()],
        });
      
        console.log('now');
        console.log(tokenId);

        if ((tokenId as bigint) > 0n)
        {

          // Step 3: Upload avatar to avatars/avatar{tokenId}.jpg
          toast.loading('Uploading Avatar...', { id: toastId }); 

          let extension = avatarFile.type.split('/')[1]?.toLowerCase() || 'jpg';
          if (extension === 'jpeg') extension = 'jpg';
          const avatarFilename  = `avatar${tokenId}.${extension}`;
          const avatarUrl       = await uploadToIPFS(avatarFile, avatarFilename);

          // Step 4: Build metadata JSON
          const metadata = {
            name: `${username}'s CloudPass`,
            description: `Your on-chain identity in the CloudVerse.`,
            image: avatarUrl,
            attributes: [
              { trait_type: "Username", value: username },
              { trait_type: "Pass ID", value: (tokenId as bigint).toString() },
              { trait_type: "Avatar", value: avatarFilename }
            ]
          };

          const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
          const metadataFile = new File([metadataBlob], `cloudPass${tokenId}.json`);

          // Step 5: Upload metadata to cloudPasses/cloudPass{tokenId}.json
          toast.loading('Uploading Metadata...', { id: toastId }); 
          const metadataUrl = await uploadToIPFS(metadataFile, `cloudPass${tokenId}.json`);

          // Step 6: Update tokenURI on-chain
          toast.loading('Updating CloudPass...', { id: toastId }); 
          const tx2 = await writeContractAsync({
            address: identityAddress as `0x${string}`,
            abi: identityAbi,
            functionName: 'updateTokenURI',
            args: [tokenId, metadataUrl],
          });
          if (!publicClient) return;
          await publicClient.waitForTransactionReceipt({ hash: tx2 });

          await onMintSuccess();
        }
      } catch (err) {
        console.error('Post-mint metadata update failed:', err);
        //toast.error('Pass minted, but metadata update failed.', { id: toastId });
      }

    } catch (err) {
      console.error('Mint failed:', err);
      toast.error('Mint failed. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  // ==========================
  // View
  // ==========================

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 text-center">You currently don't own a CloudPass</h2>
      <h1 className="text-3xl font-semibold text-gray-900 text-center">Mint your CloudPass</h1>

      <p className="text-center text-gray-600 text-sm">
        and secure your name, step into the CloudVerse, receive payments, access CloudAI’s on-chain society, and unlock even more features coming soon.
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md space-y-4">


      <div className="flex flex-col md:flex-row gap-6">
        {/* Avatar Section */}
        <div className="md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1 ">Avatar</label>

          {!avatarPreview && (
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="mt-7 block mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          )}

          {avatarError && (
            <div className="text-red-500 text-sm px-3 py-2 mt-2 rounded flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 mt-1" />
              <span>{avatarError}</span>
            </div>
          )}


          {avatarPreview && (
            <div className="flex flex-col items-center">
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="mt-1 w-32 h-32 object-cover rounded-full border"
              />
              <button
                onClick={() => {
                  setAvatarPreview(null);
                  setAvatarFile(null);    // also clear the file
                  setAvatarError(null);   // clear any avatar errors
                }}
                className="mt-2 text-sm text-blue-600 underline hover:text-blue-800"
              >
                Change image
              </button>
            </div>
          )}

        </div>

        {/* Username Section */}
        <div className="md:w-2/3">
          <label className="block text-sm font-medium text-gray-700 ">Username</label>
          <input
            type="text"
            placeholder="e.g. Joe"
            value={username}
              onChange={(e) => {
                const v = e.target.value;
                setUsername(v);
                validateUsername(v);
                setUsernameAvailable(null);  // ← clear the “available” alert immediately
              }}
            className="mt-7 w-full border border-gray-300 text-gray-900 placeholder-gray-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {usernameError && (
            <div className="text-red-500 text-sm px-3 py-2 mt-2 rounded flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 mt-1" />
              <span>{usernameError}</span>
            </div>
          )}
          {!usernameError && usernameAvailable === true && (
            <div className="text-green-600 text-sm px-1 py-2 mt-2 rounded flex items-start gap-2">
              <Check size={16} className="text-green-600 mt-1" />
              <span>Username available.</span>
            </div>
          )}
          <div className=" text-yellow-500 text-sm px-1 py-1 mt-2 rounded flex items-start gap-2">
            <AlertTriangle size={18} className="text-yellow-500 mt-1" />
            <span>Once minted, the username can’t be updated. A new mint is required to change it.</span>
          </div>
        </div>
      </div>

      <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mint price</label>
          <input
            type="text"
            disabled
            value={
               typeof mintPriceResult.data === 'bigint'
                ? format(BigInt(mintPriceResult.data) * 10n ** 18n) + ' CLOUD'
                : 'loading ...'
            }
            className="w-full border border-gray-200 text-gray-500 bg-gray-100  placeholder-gray-400 rounded-md px-3 py-2 cursor-not-allowed"
          />
        </div>

        <button
          onClick={() => {
            if (!hasEnoughStake) {
              toast(
                <>
                  A minimum of {formatUnits(minStakeRequired, 18)} CLOUD must be staked to mint your CloudPass.
                </>
              );
              return;
            }

            mint();
          }}  
          disabled={loading || !!usernameError}
          className={`w-full px-4 py-2 rounded-md font-medium transition ${
            !loading
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
        >
          {loading ? 'Minting...' : 'Mint your CloudPass'}
        </button>
      </div>


      {/* Bottom Info Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 text-center">
        <div>
          <span className="font-bold text-gray-900">Mint Price</span>
          <br />
          {typeof mintPriceResult.data === 'bigint'
            ? format(mintPriceResult.data * 10n ** 18n) + ' CLOUD'
            : '...'}
        </div>
        <div>
          <span className="font-bold text-gray-900">Stake requirement</span>
          <br />
          {typeof minStakeResult.data === 'bigint'
            ? format(minStakeResult.data * 10n ** 18n) + ' CLOUD'
            : '...'}
        </div>
      </div>


    </div>

  );

}
