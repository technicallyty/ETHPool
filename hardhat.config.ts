import { task } from "hardhat/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as dotenv from "dotenv";
import { BigNumber, Contract, Signer } from "ethers";
dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

task("deploy", "deploy the ETHPool contract to a network", async (args, hre) => {
  const [deployer]: SignerWithAddress[] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contract = await hre.ethers.getContractFactory("ETHPool");
  const ETHPool = await contract.deploy();

  console.log("ETHPool address:", ETHPool.address);
  process.env.ETHPOOL_ADDRESS = ETHPool.address;
});

task("deposit", "deposit ether to the ETHPool contract")
  .addParam("units", "the units you wish to send in (i.e. ether, wei, gwei, etc...)")
  .addParam("amount", "the amount of ether to send")
  .setAction(async (args, hre) => {
    const [account]: SignerWithAddress[] = await hre.ethers.getSigners();
    let amount: BigNumber = hre.ethers.utils.parseUnits(args.amount, args.units);
    const contract = await hre.ethers.getContractFactory("ETHPool");
    let ETHPool: Contract;
    if (process.env.ETHPOOL_ADDRESS != undefined) {
      ETHPool = contract.attach(process.env.ETHPOOL_ADDRESS);
    } else {
      console.error("ETHPool environment variable not set");
      return;
    }

    let tx = {
      from: account.address,
      to: ETHPool.address,
      value: amount
    }

    await account.sendTransaction(tx);

  });

task("balance", "get the balance of the ETHPool contract")
  .addParam("units", "the units to print the balance in (ether, wei, gwei, etc...")
  .setAction(async (args, hre) => {
    const [account]: SignerWithAddress[] = await hre.ethers.getSigners();
    const contract = await hre.ethers.getContractFactory("ETHPool");
    let ETHPool: Contract;
    if (process.env.ETHPOOL_ADDRESS != undefined) {
      ETHPool = contract.attach(process.env.ETHPOOL_ADDRESS);
    } else {
      console.error("ETHPool environment variable not set");
      return;
    }

    let units = args.units;
    let balance: BigNumber = await ETHPool.connect(account).balance();

    console.log("Balance in ", units, ": ", hre.ethers.utils.parseUnits(balance.toString(), units).toString());    
  })

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  networks: {
    goerli: {
      url: process.env.GOERLI_RPC_URL ?? "",
      accounts,
      chainId: 5,
    },

  },

  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },

      metadata: {
        bytecodeHash: "none",
      },
    },
  },

  paths: {
    tests:
      "./test/"
  },

  mocha: {
    // 5 minutes:
    timeout: 300000,
  },
};

export default config;