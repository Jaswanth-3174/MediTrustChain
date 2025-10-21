const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const MediTrust = await ethers.getContractFactory("MediTrust");
  const contract = await MediTrust.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("MediTrust deployed to:", address);

  // Write ABI and address to src for frontend
  const artifactsPath = path.join(__dirname, "..", "artifacts", "contracts", "MediTrust.sol", "MediTrust.json");
  const artifact = JSON.parse(fs.readFileSync(artifactsPath, "utf8"));

  const outDirAbi = path.join(__dirname, "..", "src", "abi");
  const outDirContracts = path.join(__dirname, "..", "src", "contracts");
  if (!fs.existsSync(outDirAbi)) fs.mkdirSync(outDirAbi, { recursive: true });
  if (!fs.existsSync(outDirContracts)) fs.mkdirSync(outDirContracts, { recursive: true });

  fs.writeFileSync(path.join(outDirAbi, "MediTrust.json"), JSON.stringify(artifact.abi, null, 2));
  // Maintain single-address file for backwards compatibility
  fs.writeFileSync(path.join(outDirContracts, "address.json"), JSON.stringify({ MediTrust: address }, null, 2));

  // Maintain a per-network addresses mapping keyed by chainId
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();
  const addressesPath = path.join(outDirContracts, "addresses.json");
  let addresses = {};
  if (fs.existsSync(addressesPath)) {
    try { addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8")); } catch {}
  }
  addresses[chainId] = address;
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
