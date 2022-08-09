const { assert, expect } = require("chai");
const { VoidSigner } = require("ethers");
const { network, ethers, deployments, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat.config")


!developmentChains.includes(network.name) ? 
    describe.skip :
    describe("NftMarketplace Unit Test", () => {
        let deployer, nftMarketplace, basicNft, player
        const PRICE = ethers.utils.parseEther(".01")
        const NEW_PRICE = ethers.utils.parseEther(".02")
        const TOKEN_ID = 0;

        beforeEach(async () => {
            const accounts = await ethers.getSigners();
            deployer = (await getNamedAccounts()).deployer;
            user = accounts[1];
            await deployments.fixture("all");
            nftMarketplace = await ethers.getContract("NftMarketplace");
            basicNft = await ethers.getContract("BasicNft")
            await basicNft.mintNft()
            await basicNft.approve(nftMarketplace.address, TOKEN_ID)
        })

        describe("listItem", () => {
            it("listings can be bought", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const playerConnectedNftMarketplace = nftMarketplace.connect(user)
                await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {value: PRICE})
                const newOwner = await basicNft.ownerOf(TOKEN_ID)
                const deployerProceeds = await nftMarketplace.getProceeds(deployer)
                assert(newOwner.toString() == user.address)
                assert(deployerProceeds.toString() == PRICE.toString())
            })
            it("adds listing to Listings", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                assert(await nftMarketplace.getListing(basicNft.address, TOKEN_ID))
            })
            it("emits event after listing completed", async () => {
                expect(await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit("ItemListed")
            })
            it("reverts if user listing is NOT owner", async () => {
                nftMarketplace = nftMarketplace.connect(user)
                await basicNft.approve(user.address, TOKEN_ID)
                await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.be.revertedWith("NftMarketplace__NotOwner")
            })
            it("reverts if nft is already listed", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.be.revertedWith("NftMarketplace__AlreadyListed")
            })
            it("reverts when listing price is below or equal to 0", async () => {
                await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, 0)).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero")
            }) 
            it("reverts when nft is NOT approved for marketplace", async () => {
                await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
            })
        })

        describe("buyItem", () => {
            it("reverts if nft is NOT listed", async () => {
                nftMarketplace.connect(user)
                await expect(nftMarketplace.buyItem(basicNft.address, TOKEN_ID)).to.be.revertedWith("NftMarketplace__NotListed")
            })
            it("reverts if value is less than listing price", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                await expect(nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {value: 0})).to.be.revertedWith("NftMarketplace__PriceNotMet")
            })
            it("adds proceeds to seller", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const begProceedBalance = await nftMarketplace.getProceeds(deployer)
                console.log(begProceedBalance)
                const userNftMarketplace = nftMarketplace.connect(user)
                await userNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {value: PRICE})
                const endProceedBalance = await nftMarketplace.getProceeds(deployer)
                assert(endProceedBalance > begProceedBalance)
                assert(endProceedBalance.toString() == PRICE.toString())
            })
            it("transfers NFT from seller to buyer", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const userNftMarketplace = nftMarketplace.connect(user)
                await userNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {value: PRICE})
                const newOwner = await basicNft.ownerOf(TOKEN_ID);
                assert(newOwner, user)
            })
            it("emits an event", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const userNftMarketplace = nftMarketplace.connect(user)
                expect(await userNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {value: PRICE})).to.emit("ItemBought")
            })
        })

        describe("cancelListing", () => {
            it("emits an event", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                expect(await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.emit("ItemCanceled")
            })
            it("reverts if someone other than owner cancels", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const userNftMarketplace = nftMarketplace.connect(user)
                await expect(userNftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.be.revertedWith("NftMarketplace__NotOwner")
            })
            it("revert if no nft is listed", async () => {
                await expect(nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.be.revertedWith("NftMarketplace__NotListed")
            })
        })

        describe("updateListing", () => {
            it("updates price of new listing", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const oldPrice = (await nftMarketplace.getListing(basicNft.address, TOKEN_ID)).price
                await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, NEW_PRICE)
                const newPrice = (await nftMarketplace.getListing(basicNft.address, TOKEN_ID)).price

                assert(newPrice, await ethers.utils.parseEther("0.2"))
            })
            it("emits an event", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                expect(await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, NEW_PRICE)).to.emit("ItemListed")
            })
            it("revert if no nft is listed", async () => {
                await expect(nftMarketplace.updateListing(basicNft.address, TOKEN_ID, NEW_PRICE)).to.be.revertedWith("NftMarketplace__NotListed")
            })
            it("reverts if someone other than owner cancels", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const userNftMarketplace = nftMarketplace.connect(user)
                await expect(userNftMarketplace.updateListing(basicNft.address, TOKEN_ID, NEW_PRICE)).to.be.revertedWith("NftMarketplace__NotOwner")
            })
        })
        describe("updateListing", () => {
            it("reverts if owner has no proceeds to withdraw", async () => {
                await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith("NftMarketplace__NoProceeds")
            })
            it("withdraws proceeds", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const userNftMarketplace = nftMarketplace.connect(user)
                await userNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {value: PRICE})
                await nftMarketplace.withdrawProceeds()
                assert(await nftMarketplace.getProceeds().toString(), 0)
            })
        })
    })