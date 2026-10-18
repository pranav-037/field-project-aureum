const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=================================================");
  console.log("Deploying ArtchainRegistry with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH/POL");
  console.log("=================================================");

  const ArtchainRegistry = await ethers.getContractFactory("ArtchainRegistry");
  const registry = await ArtchainRegistry.deploy(deployer.address);

  await registry.waitForDeployment();
  const address = await registry.getAddress();

  console.log(" ArtchainRegistry successfully deployed to:", address);
  console.log("=================================================");
  console.log("Admin Address:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("=================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
