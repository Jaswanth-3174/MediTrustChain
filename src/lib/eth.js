import { ethers, isAddress, getAddress as normalizeAddress } from "ethers";
import abi from "../abi/MediTrust.json";
import singleAddress from "../contracts/address.json";
import addressesByChain from "../contracts/addresses.json";

export const getProvider = () => {
  if (!window.ethereum) throw new Error("MetaMask not found");
  return new ethers.BrowserProvider(window.ethereum);
};

const HARDHAT = { chainId: "0x7A69", id: 31337, name: "Hardhat Local", rpc: [process.env.REACT_APP_HARDHAT_RPC || "http://127.0.0.1:8545"] };
// Allow overriding Ganache RPC/chainIds via env. Defaults match typical Ganache GUI/CLI.
const GANACHE = { chainId: (process.env.REACT_APP_GANACHE_CHAIN_ID_HEX || "0x539"), id: parseInt((process.env.REACT_APP_GANACHE_CHAIN_ID_DEC || "1337"), 10), name: "Ganache Local", rpc: [process.env.REACT_APP_GANACHE_RPC || "http://127.0.0.1:7545"] };
const GANACHE_ALT = { chainId: (process.env.REACT_APP_GANACHE_ALT_CHAIN_ID_HEX || "0x1691"), id: parseInt((process.env.REACT_APP_GANACHE_ALT_CHAIN_ID_DEC || "5777"), 10), name: "Ganache Local 5777", rpc: [process.env.REACT_APP_GANACHE_ALT_RPC || process.env.REACT_APP_GANACHE_RPC || "http://127.0.0.1:7545"] };

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
  // Check local override first
  const overrideMap = JSON.parse(localStorage.getItem("contractOverrideByChain") || "{}");
  const overrideAddr = overrideMap[chainId];
  if (overrideAddr && isAddress(overrideAddr)) {
    return { address: normalizeAddress(overrideAddr), chainId, source: "override" };
  }
  const address = (addressesByChain && addressesByChain[chainId]) || singleAddress.MediTrust || null;
  return { address, chainId, source: address ? (addressesByChain && addressesByChain[chainId] ? "mapping" : "single") : "none" };
}

export const getContract = async (withSigner = true) => {
  const provider = getProvider();
  const net = await provider.getNetwork();
  const chainId = Number(net.chainId).toString();
  // Build candidates: override -> mapping -> single
  const overrideMap = JSON.parse(localStorage.getItem("contractOverrideByChain") || "{}");
  const overrideAddr = overrideMap[chainId];
  const mappingAddr = addressesByChain && addressesByChain[chainId];
  const singleAddr = singleAddress && singleAddress.MediTrust;

  // If override exists but has no code on current provider, clear it automatically to avoid stale addresses after restarts
  if (overrideAddr) {
    try {
      const code = await provider.getCode(isAddress(overrideAddr) ? normalizeAddress(overrideAddr) : overrideAddr);
      if (!code || code === "0x") {
        delete overrideMap[chainId];
        localStorage.setItem("contractOverrideByChain", JSON.stringify(overrideMap));
      }
    } catch {}
  }

  const candidates = [overrideMap[chainId], mappingAddr, singleAddr]
    .filter(Boolean)
    .map(a => (isAddress(a) ? normalizeAddress(a) : null))
    .filter(Boolean);

  if (candidates.length === 0) {
    throw new Error("Contract address not configured for this network. Please deploy and refresh.");
  }

  let address = null;
  for (const a of candidates) {
    try {
      const code = await provider.getCode(a);
      if (code && code !== "0x") { address = a; break; }
    } catch {}
  }

  if (!address) {
    const tried = candidates.join(", ");
    // Diagnose common mismatch: local RPC has code, MetaMask provider reports no code
    try {
      const diag = await diagnoseContractMismatch();
      if (diag && diag.address && diag.localRpcHasCode && !diag.metaMaskHasCode) {
        throw new Error(
          `Contract not found via MetaMask provider on chainId ${chainId}. Local RPC ${diag.localRpc} HAS code at ${diag.address}, ` +
          `but your MetaMask network likely points to a different RPC. Fix: update MetaMask network RPC URL to http://127.0.0.1:7545 (Chain ID 1337), then refresh. ` +
          `Tried addresses: ${tried}`
        );
      }
    } catch {}
    throw new Error(`Contract not found on the current network (chainId ${chainId}). Tried: ${tried}. Switch to the correct network, clear any bad override, or redeploy.`);
  }
  if (withSigner) {
    const signer = await provider.getSigner();
    return new ethers.Contract(address, abi, signer);
  }
  return new ethers.Contract(address, abi, provider);
};

// removed legacy local tx overrides to avoid fee mode mismatches

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

export const getRecordsAuthorized = async (patient) => {
  // Must use signer so msg.sender is set correctly for authorization check
  const contract = await getContract(true);
  return await contract.getRecordsAuthorized(patient);
};

export const grantReadAccess = async (viewer) => {
  const contract = await getContract(true);
  // Try to estimate gas and add a safety margin; fallback to no overrides, then to a generous cap
  try {
    const est = await contract.estimateGas.grantReadAccess(viewer);
    const margin = (est * 3n) / 2n; // 1.5x
    const gasLimit = margin < 100000n ? 100000n : margin; // ensure reasonable floor
    const tx = await contract.grantReadAccess(viewer, { gasLimit });
    await tx.wait();
    return;
  } catch (e) {
    // continue to retry paths below
  }
  // Retry without any overrides to let the wallet/provider decide
  try {
    const tx = await contract.grantReadAccess(viewer);
    await tx.wait();
    return;
  } catch (e2) {
    // continue to final fallback
  }
  // Final fallback with a high gas limit
  try {
    const tx = await contract.grantReadAccess(viewer, { gasLimit: 500000n, type: 0 });
    await tx.wait();
    return;
  } catch (e3) {
    const errMsg = (e3?.shortMessage || e3?.message || String(e3));
    throw new Error(`Grant access failed: ${errMsg}. Tips: ensure your MetaMask is on Ganache (http://127.0.0.1:7545, chainId 1337), the contract address matches this chain, and your account has test ETH.`);
  }
};

export const revokeReadAccess = async (viewer) => {
  const contract = await getContract(true);
  try {
    const est = await contract.estimateGas.revokeReadAccess(viewer);
    const margin = (est * 3n) / 2n; // 1.5x
    const gasLimit = margin < 100000n ? 100000n : margin;
    const tx = await contract.revokeReadAccess(viewer, { gasLimit });
    await tx.wait();
    return;
  } catch (e) {
    // continue to retry paths below
  }
  try {
    const tx = await contract.revokeReadAccess(viewer);
    await tx.wait();
    return;
  } catch (e2) {
    // continue to final fallback
  }
  try {
    const tx = await contract.revokeReadAccess(viewer, { gasLimit: 500000n, type: 0 });
    await tx.wait();
    return;
  } catch (e3) {
    const errMsg = (e3?.shortMessage || e3?.message || String(e3));
    throw new Error(`Revoke access failed: ${errMsg}. Tips: ensure your MetaMask is on Ganache (http://127.0.0.1:7545, chainId 1337), the contract address matches this chain, and your account has test ETH.`);
  }
};

export const hasReadAccess = async (patient, viewer) => {
  const contract = await getContract(false);
  return await contract.hasReadAccess(patient, viewer);
};

// --- Roles & Pharmacy/Insurer integrations ---
export const isPharmacy = async (addr) => {
  const contract = await getContract(false);
  return await contract.isPharmacy(addr);
};

export const isInsurer = async (addr) => {
  const contract = await getContract(false);
  return await contract.isInsurer(addr);
};

export const registerPharmacy = async () => {
  const contract = await getContract(true);
  try {
    const est = await contract.estimateGas.registerPharmacy();
    const tx = await contract.registerPharmacy({ gasLimit: (est * 3n) / 2n });
    await tx.wait();
  } catch {
    const tx = await contract.registerPharmacy({ gasLimit: 200000n, type: 0 });
    await tx.wait();
  }
};

export const registerInsurer = async () => {
  const contract = await getContract(true);
  try {
    const est = await contract.estimateGas.registerInsurer();
    const tx = await contract.registerInsurer({ gasLimit: (est * 3n) / 2n });
    await tx.wait();
  } catch {
    const tx = await contract.registerInsurer({ gasLimit: 200000n, type: 0 });
    await tx.wait();
  }
};

export const dispensePrescription = async (patient, cid) => {
  const contract = await getContract(true);
  try {
    const est = await contract.estimateGas.dispensePrescription(patient, cid);
    const tx = await contract.dispensePrescription(patient, cid, { gasLimit: (est * 3n) / 2n });
    await tx.wait();
  } catch {
    const tx = await contract.dispensePrescription(patient, cid, { gasLimit: 300000n, type: 0 });
    await tx.wait();
  }
};

export const getDispensesByPatient = async (patient) => {
  const contract = await getContract(false);
  return await contract.getDispensesByPatient(patient);
};

export const submitClaim = async (patient, cid, amountWei, note) => {
  const contract = await getContract(true);
  try {
    const est = await contract.estimateGas.submitClaim(patient, cid, amountWei, note);
    const tx = await contract.submitClaim(patient, cid, amountWei, note, { gasLimit: (est * 3n) / 2n });
    await tx.wait();
  } catch {
    const tx = await contract.submitClaim(patient, cid, amountWei, note, { gasLimit: 400000n, type: 0 });
    await tx.wait();
  }
};

export const updateClaimStatus = async (id, status, note) => {
  const contract = await getContract(true);
  try {
    const est = await contract.estimateGas.updateClaimStatus(id, status, note);
    const tx = await contract.updateClaimStatus(id, status, note, { gasLimit: (est * 3n) / 2n });
    await tx.wait();
  } catch {
    const tx = await contract.updateClaimStatus(id, status, note, { gasLimit: 300000n, type: 0 });
    await tx.wait();
  }
};

export const getClaimsByPatient = async (patient) => {
  const contract = await getContract(false);
  return await contract.getClaimsByPatient(patient);
};

// Manual override management for contract addresses per chain (useful when Ganache restarts)
export function setContractOverride(chainId, address) {
  if (!isAddress(address)) throw new Error("Invalid 0x address");
  const map = JSON.parse(localStorage.getItem("contractOverrideByChain") || "{}");
  map[String(Number(chainId))] = normalizeAddress(address);
  localStorage.setItem("contractOverrideByChain", JSON.stringify(map));
}

export function clearContractOverride(chainId) {
  const map = JSON.parse(localStorage.getItem("contractOverrideByChain") || "{}");
  const key = String(Number(chainId));
  if (key in map) {
    delete map[key];
    localStorage.setItem("contractOverrideByChain", JSON.stringify(map));
  }
}

export async function verifyContractDeployed(address) {
  const provider = getProvider();
  if (!isAddress(address)) return false;
  const code = await provider.getCode(normalizeAddress(address));
  return !!(code && code !== "0x");
}

// Diagnose when MetaMask is on chainId 1337 but reports no code, while local RPC has code.
export async function diagnoseContractMismatch() {
  const provider = getProvider();
  const net = await provider.getNetwork();
  const chainId = Number(net.chainId).toString();
  const mappingAddr = (addressesByChain && addressesByChain[chainId]) || singleAddress.MediTrust || null;
  const result = { chainId, address: mappingAddr || null, metaMaskHasCode: false, localRpcHasCode: null, localRpc: "http://127.0.0.1:7545" };
  if (!mappingAddr || !isAddress(mappingAddr)) return result;
  try {
    const metaCode = await provider.getCode(mappingAddr);
    result.metaMaskHasCode = !!(metaCode && metaCode !== "0x");
  } catch {}
  try {
    const localProvider = new ethers.JsonRpcProvider(result.localRpc);
    const localCode = await localProvider.getCode(mappingAddr);
    result.localRpcHasCode = !!(localCode && localCode !== "0x");
  } catch {
    result.localRpcHasCode = null;
  }
  return result;
}

export async function pingLocalRpc(url = "http://127.0.0.1:7545") {
  try {
    const p = new ethers.JsonRpcProvider(url);
    await p.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}
