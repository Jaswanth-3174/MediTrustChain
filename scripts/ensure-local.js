// Ensure a contract is deployed on local Ganache and mapping is up to date
// Usage: node scripts/ensure-local.js

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ethers } = require("ethers");

const GANACHE_RPC = process.env.GANACHE_URL || "http://127.0.0.1:7545";
const CHAIN_ID = 1337; // default for our Ganache setup

async function getProvider() {
  const provider = new ethers.JsonRpcProvider(GANACHE_RPC);
  // probe connection
  await provider.getBlockNumber();
  return provider;
}

function readAddressMapping() {
  const addressesPath = path.join(__dirname, "..", "src", "contracts", "addresses.json");
  if (!fs.existsSync(addressesPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  } catch {
    return {};
  }
}

async function codeExists(provider, address) {
  if (!address) return false;
  try {
    const code = await provider.getCode(address);
    return !!(code && code !== "0x");
  } catch {
    return false;
  }
}

function deployWithHardhat() {
  console.log("No code found at mapped address. Deploying with Hardhat to ganache...");
  const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", [
    "hardhat",
    "run",
    "scripts/deploy.js",
    "--network",
    "ganache",
  ], {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error("Hardhat deploy failed.");
  }
}

(async () => {
  try {
    const provider = await getProvider();
    const addresses = readAddressMapping();
    const mapped = addresses[String(CHAIN_ID)];
    if (await codeExists(provider, mapped)) {
      console.log(`OK: Code exists at ${mapped} on chain ${CHAIN_ID}.`);
      process.exit(0);
    }
    deployWithHardhat();
    // Re-read mapping and re-check
    const updated = readAddressMapping()[String(CHAIN_ID)];
    if (!(await codeExists(provider, updated))) {
      throw new Error("Deployment did not result in code at the new address. Check Ganache and try again.");
    }
    console.log(`Deployed and verified contract at ${updated} on chain ${CHAIN_ID}.`);
    process.exit(0);
  } catch (err) {
    console.error("ensure-local error:", err.message || String(err));
    console.error("Hint: Make sure Ganache is running on", GANACHE_RPC, "(try: npm run ganache:persist)");
    process.exit(1);
  }
})();
