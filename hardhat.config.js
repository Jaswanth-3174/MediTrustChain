require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    localhost: {
      url: process.env.LOCALCHAIN_URL || "http://127.0.0.1:8545",
    },
    ganache: {
      url: process.env.GANACHE_URL || "http://127.0.0.1:7545",
    },
  },
};
