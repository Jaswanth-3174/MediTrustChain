import { ethers } from "ethers";
import abi from "../abi/MediTrust.json";
import singleAddress from "../contracts/address.json";
import addressesByChain from "../contracts/addresses.json";

export const getProvider = () => {
  if (!window.ethereum) throw new Error("MetaMask not found");
  return new ethers.BrowserProvider(window.ethereum);
};

const HARDHAT = { chainId: "0x7A69", id: 31337, name: "Hardhat Local", rpc: ["http://127.0.0.1:8545"] };
const GANACHE = { chainId: "0x539", id: 1337, name: "Ganache Local", rpc: ["http://127.0.0.1:7545"] };
const GANACHE_ALT = { chainId: "0x1691", id: 5777, name: "Ganache Local 5777", rpc: ["http://127.0.0.1:7545"] };

export async function ensureLocalChain(provider) {
  const network = await provider.getNetwork();
  const currentId = Number(network?.chainId);
  if (currentId === HARDHAT.id || currentId === GANACHE.id || currentId === GANACHE_ALT.id) return;
  // Prefer Ganache
  try {
    await provider.send("wallet_switchEthereumChain", [{ chainId: GANACHE.chainId }]);
    return;
  } catch (e) {
    if (e?.code === 4902 || /Unrecognized chain ID/i.test(e?.message || "")) {
      try {
        await provider.send("wallet_addEthereumChain", [{
          chainId: GANACHE.chainId,
          chainName: GANACHE.name,
          rpcUrls: GANACHE.rpc,
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        }]);
        return;
      } catch {}
    }
  }
  // Try alternate Ganache chainId 5777
  try {
    await provider.send("wallet_switchEthereumChain", [{ chainId: GANACHE_ALT.chainId }]);
    return;
  } catch (e) {
    if (e?.code === 4902 || /Unrecognized chain ID/i.test(e?.message || "")) {
      try {
        await provider.send("wallet_addEthereumChain", [{
          chainId: GANACHE_ALT.chainId,
          chainName: GANACHE_ALT.name,
          rpcUrls: GANACHE_ALT.rpc,
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        }]);
        return;
      } catch {}
    }
  }
  // Fallback to Hardhat
  try {
    await provider.send("wallet_switchEthereumChain", [{ chainId: HARDHAT.chainId }]);
    return;
  } catch (e) {
    // 4902: chain not added
    if (e?.code === 4902 || /Unrecognized chain ID/i.test(e?.message || "")) {
      try {
        await provider.send("wallet_addEthereumChain", [{
          chainId: HARDHAT.chainId,
          chainName: HARDHAT.name,
          rpcUrls: HARDHAT.rpc,
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        }]);
        return;
      } catch {}
    }
  }
}

export const connectWallet = async () => {
  const provider = getProvider();
  // request accounts
  const accounts = await provider.send("eth_requestAccounts", []);
  // ensure local network to avoid real gas
  await ensureLocalChain(provider);
  const signer = await provider.getSigner();
  return { provider, signer, account: accounts[0] };
};

export async function switchToGanache() {
  const provider = getProvider();
  try {
    await provider.send("wallet_switchEthereumChain", [{ chainId: GANACHE.chainId }]);
  } catch (e) {
    if (e?.code === 4902 || /Unrecognized chain ID/i.test(e?.message || "")) {
      await provider.send("wallet_addEthereumChain", [{
        chainId: GANACHE.chainId,
        chainName: GANACHE.name,
        rpcUrls: GANACHE.rpc,
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      }]);
    } else {
      throw e;
    }
  }
}

export async function getSelectedContractAddress() {
  const provider = getProvider();
  const net = await provider.getNetwork();
  const chainId = Number(net.chainId).toString();
  const address = (addressesByChain && addressesByChain[chainId]) || singleAddress.MediTrust || null;
  return { address, chainId };
}

export const getContract = async (withSigner = true) => {
  const provider = getProvider();
  const net = await provider.getNetwork();
  const chainId = Number(net.chainId).toString();
  const address = (addressesByChain && addressesByChain[chainId]) || singleAddress.MediTrust;
  if (!address) throw new Error("Contract address not configured for this network. Please deploy and refresh.");
  // Verify there is code at the address
  const code = await provider.getCode(address);
  if (!code || code === "0x") {
    throw new Error("Contract not found on the current network. Switch to the network where it was deployed or redeploy.");
  }
  if (withSigner) {
    const signer = await provider.getSigner();
    return new ethers.Contract(address, abi, signer);
  }
  return new ethers.Contract(address, abi, provider);
};

async function getLocalTxOverrides() {
  try {
    const provider = getProvider();
    const net = await provider.getNetwork();
    const id = Number(net.chainId);
    if ([1337, 5777, 31337].includes(id)) {
      // Force zero gas on local dev chains so MetaMask shows $0.00
      // IMPORTANT: Don't mix legacy (gasPrice) with EIP-1559 (maxFeePerGas/maxPriorityFeePerGas)
      const fee = await provider.getFeeData();
      if (fee && fee.maxFeePerGas != null && fee.maxPriorityFeePerGas != null) {
        // EIP-1559 mode
        return { maxFeePerGas: 0n, maxPriorityFeePerGas: 0n };
      }
      // Legacy mode
      return { gasPrice: 0n };
    }
  } catch {}
  return {};
}

export const storeRecord = async (patient, cid, description) => {
  const contract = await getContract(true);
  // Do not pass fee overrides; let the wallet/provider set correct EIP-1559 or legacy fields
  const tx = await contract.storeRecord(patient, cid, description);
  await tx.wait();
};

export const getRecords = async (patient) => {
  const contract = await getContract(false);
  return await contract.getRecords(patient);
};
