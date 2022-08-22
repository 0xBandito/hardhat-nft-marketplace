const { ethers, network } = require("hardhat")
const {moveBlocks} = require("../utils/move-blocks")

const TOKEN_ID = 3;

async function cancel() {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")
    const cancelTx = await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
    await cancelTx.wait(1)
    console.log(cancelTx)
    console.log("NFT Canceled")
    if (network.config.chainId == "31337") {
        await moveBlocks(2, (sleepAmount = 1000))
    }
}

cancel()
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })