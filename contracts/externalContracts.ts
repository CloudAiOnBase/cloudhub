import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

// Detect current network (default to localhost)
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "localhost";

// Load contract addresses
import contractAddresses from "./deployments.json";

// Function to load the correct ABI based on the selected network
const loadABI = (contractName: string) => {
  try {
    return require(`./abis/${NETWORK}/${contractName}.json`);
  } catch (error) {
    console.error(`❌ ABI not found for ${contractName} on ${NETWORK}`, error);
    return { abi: [] }; // Return empty ABI if missing
  }
};

export const externalContracts = {
  CloudToken: {
    address: contractAddresses[NETWORK]?.CloudToken || "0x0000000000000000000000000000000000000000",
    abi: loadABI("CloudToken"),
  },
  CloudUtils: {
    address: contractAddresses[NETWORK]?.CloudUtils || "0x0000000000000000000000000000000000000000",
    abi: loadABI("CloudUtils"),
  },
  CloudStakeVault: {
    address: contractAddresses[NETWORK]?.CloudStakeVault || "0x0000000000000000000000000000000000000000",
    abi: loadABI("CloudStakeVault"),
  },
  CloudRewardPool: {
    address: contractAddresses[NETWORK]?.CloudRewardPool || "0x0000000000000000000000000000000000000000",
    abi: loadABI("CloudRewardPool"),
  },
  CloudStaking: {
    address: contractAddresses[NETWORK]?.CloudStaking || "0x0000000000000000000000000000000000000000",
    abi: loadABI("CloudStaking"),
  },
} satisfies GenericContractsDeclaration;

export default externalContracts;

