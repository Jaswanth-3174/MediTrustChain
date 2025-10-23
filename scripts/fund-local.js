// Send test ETH on local Ganache to a target address to cover gas
// Usage: node scripts/fund-local.js <targetAddress> [amountEth]

const { ethers } = require("ethers");

async function main() {
  const target = process.argv[2];
  const amountEth = process.argv[3] || "5"; // default 5 ETH
  if (!target || !/^0x[0-9a-fA-F]{40}$/.test(target)) {
    console.error("Usage: node scripts/fund-local.js <0xAddress> [amountEth]");
    process.exit(1);
  }
  const url = process.env.GANACHE_URL || "http://127.0.0.1:7545";
  const provider = new ethers.JsonRpcProvider(url);
  const signer = await provider.getSigner(0); // first unlocked Ganache account
  const balance = await provider.getBalance(await signer.getAddress());
  console.log("Funding from:", await signer.getAddress(), "balance:", ethers.formatEther(balance), "ETH");
  const value = ethers.parseEther(amountEth);
  const tx = await signer.sendTransaction({ to: target, value });
  console.log("Sent:", amountEth, "ETH to", target, "tx:", tx.hash);
  await tx.wait();
  const newBal = await provider.getBalance(target);
  console.log("Recipient balance:", ethers.formatEther(newBal), "ETH");
}

main().catch((e) => { console.error(e); process.exit(1); });
