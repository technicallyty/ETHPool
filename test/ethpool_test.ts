import { expect } from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
chai.should();
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("ETHPool", function () {

  let ETHPool: Contract;
  let signers: SignerWithAddress[];

  beforeEach(async () => {
    signers = await ethers.getSigners();
    const contract = await ethers.getContractFactory("ETHPool");
    ETHPool = await contract.deploy();
    await ETHPool.deployed();
  });

  it("should deplay and have the deployers address as the team", async function () {
    const team = signers[0];

    let teamPool: BigNumber = ethers.utils.parseEther('1');
    await sendEtherToContract(teamPool, team, ETHPool.address);
    let contractTeamPool: BigNumber = await ETHPool.getTeamDeposit(0);
    expect(teamPool.toString()).equal(contractTeamPool.toString());
  });

  it("should accept a deposit from the user", async function () {
    let user1 = signers[1];
    let user1Addr = user1.address;
    let user1Deposit: BigNumber = ethers.utils.parseEther('2');
    await sendEtherToContract(user1Deposit, user1, ETHPool.address);
    let userdeposit: BigNumber = await ETHPool.getDeposit(user1Addr, 0);
    expect(userdeposit.toString()).equal(user1Deposit.toString());
  });

  it("should withdraw and drain the contract since there are no other depositers", async function () {
    let team: SignerWithAddress = signers[0];
    let user: SignerWithAddress = signers[1];
    let userDeposit: BigNumber = ethers.utils.parseEther('1');
    let teamDeposit: BigNumber = ethers.utils.parseEther('1');
    let expectedAmount: BigNumber = userDeposit.add(teamDeposit);

    await sendEtherToContract(userDeposit, user, ETHPool.address);
    await sendEtherToContract(teamDeposit, team, ETHPool.address);

    await expect(ETHPool.connect(user).withdrawRewards(user.address, 0)).to.emit(ETHPool, 'Withdraw').withArgs(user.address, expectedAmount);
  });
  
  it("should have two depositors, splitting the rewards evenly", async function () {
    let team: SignerWithAddress = signers[0];
    let user1: SignerWithAddress = signers[1];
    let user2: SignerWithAddress = signers[2];

    let zero: BigNumber = ethers.utils.parseEther('0.00');
    let userDeposit: BigNumber = ethers.utils.parseEther('0.005');
    let teamDeposit: BigNumber = ethers.utils.parseEther('0.01');
    let poolTotal = userDeposit.add(userDeposit);

    // user1 deposits 0.005 to pool
    // user 2 deposits 0.005 to pool
    // team deposits 0.01 for rewards
    await sendEtherToContract(userDeposit, user1, ETHPool.address);
    await sendEtherToContract(userDeposit, user2, ETHPool.address);
    await sendEtherToContract(teamDeposit, team, ETHPool.address);


    // pool should be equal to user1 + user 2 deposit
    let pool: BigNumber = await ETHPool.poolTotal(0);
    expect(pool.toString()).to.equal(poolTotal.toString(), "unexpected user pool amount");


    // rewards pool should be equal to team deposit
    let rewardsPool: BigNumber = await ETHPool.getTeamDeposit(0);
    expect(rewardsPool.toString()).to.equal(teamDeposit.toString(), "unexpected team rewards amount");

    // when user 1 withdraws, should get their deposit (0.005) + 50% of rewards = .01
    expect(await ETHPool.connect(user1).withdrawRewards(user1.address, 0)).to.emit(ETHPool, "Withdraw").withArgs(user1.address, ethers.utils.parseEther('0.01'));

    // user1 should have no deposits left
    let user1Deposit: BigNumber = await ETHPool.getDeposit(user1.address, 0);
    expect(user1Deposit.toString()).to.equal(zero.toString());

    // rewards pool should only have half left (0.005);
    rewardsPool = await ETHPool.getTeamDeposit(0);
    expect(rewardsPool.toString()).to.equal(userDeposit.toString());

    // user 2 withdraws, should get their deposit (0.005) + 100% of rewards = .01
    expect(await ETHPool.connect(user2).withdrawRewards(user2.address, 0)).to.emit(ETHPool, "Withdraw").withArgs(user2.address, ethers.utils.parseEther('0.01'));

    // there should be nothing left in the deposit pool
    pool = await ETHPool.poolTotal(0);
    expect(pool.toNumber()).to.equal(zero.toNumber());

    // team pool should be drained as well
    rewardsPool = await ETHPool.getTeamDeposit(0);
    expect(rewardsPool.toNumber()).to.equal(zero.toNumber());
  })

  it("should fail when a user attempts to withdraw twice", async function () {
    let team: SignerWithAddress = signers[0];
    let user1: SignerWithAddress = signers[1];

    let userDeposit: BigNumber = ethers.utils.parseEther('0.005');
    let teamDeposit: BigNumber = ethers.utils.parseEther('0.01');


    await sendEtherToContract(userDeposit, user1, ETHPool.address);
    await sendEtherToContract(teamDeposit, team, ETHPool.address);
    
    expect(await ETHPool.connect(user1).withdrawRewards(user1.address, 0)).to.emit(ETHPool, "Withdraw").withArgs(user1.address, userDeposit.add(teamDeposit));

    const withdraw = ETHPool.connect(user1).withdrawRewards(user1.address, 0);
    await expect(withdraw).eventually.be.rejectedWith("VM Exception while processing transaction: reverted with reason string 'cannot withdraw 0 funds'");
  })

  it("should withdaw only users funds when there is 0 team rewards", async function () {
    let user1: SignerWithAddress = signers[1];
    let userDeposit: BigNumber = ethers.utils.parseEther('0.005');
    await sendEtherToContract(userDeposit, user1, ETHPool.address);

    expect(await ETHPool.connect(user1).withdrawRewards(user1.address, 0)).to.emit(ETHPool, "Withdraw").withArgs(user1.address, userDeposit);
  })

  it("should just give the user their funds back if they deposited AFTER the team", async function() {
    let user: SignerWithAddress = signers[1];
    let team: SignerWithAddress = signers[0];

    let deposit = ethers.utils.parseEther('1');
    await sendEtherToContract(deposit, team, ETHPool.address);
    await sendEtherToContract(deposit, user, ETHPool.address);

    // set deposit ID to 1 because the team counter will have increased it
    expect(await ETHPool.connect(user).withdrawRewards(user.address, 1)).to.emit(ETHPool, "Withdraw").withArgs(user.address, deposit);
  })

  it("should increase the depositID global when team deposits", async function() {
    let team = signers[0];
    let deposit = ethers.utils.parseEther('1');

    let depositID: BigNumber = await ETHPool.currentDepositID();

    await sendEtherToContract(deposit, team, ETHPool.address);
    
    let depositID2: BigNumber = await ETHPool.currentDepositID();

    expect(depositID.toNumber() + 1).to.equal(depositID2.toNumber());
  })
  
  it("should have 2 user deposit ID's after depositing between a team member", async function() {
    let team: SignerWithAddress = signers[0];
    let user: SignerWithAddress = signers[1];

    let deposit: BigNumber = ethers.utils.parseEther('1');
    await sendEtherToContract(deposit, user, ETHPool.address);
    await sendEtherToContract(deposit, team, ETHPool.address);
    await sendEtherToContract(deposit, user, ETHPool.address);

    let indexes: BigNumber[] = await ETHPool.getDepositIDs(user.address);
    expect(indexes.length).to.equal(2);
  })

  it("should withdraw the amount according to when they deposited", async function() {
    let team: SignerWithAddress = signers[0];
    let user1: SignerWithAddress = signers[1];
    let user2: SignerWithAddress = signers[2];

    let userDeposit: BigNumber = ethers.utils.parseEther('1');
    let teamDeposit: BigNumber = ethers.utils.parseEther('2');

    await sendEtherToContract(userDeposit, user1, ETHPool.address);
    await sendEtherToContract(teamDeposit, team, ETHPool.address);
    await sendEtherToContract(userDeposit, user2, ETHPool.address);

    // at this point - user1 will have a deposit index 0
    // and user2 will have a deposit index 1
    // and team will have deposit index at 0.

    expect(await ETHPool.connect(user1).withdrawRewards(user1.address, 0)).to.emit(ETHPool, "Withdraw").withArgs(user1.address, userDeposit.add(teamDeposit));
    expect(await ETHPool.connect(user2).withdrawRewards(user2.address, 1)).to.emit(ETHPool, "Withdraw").withArgs(user2.address, userDeposit);

    let indexes: BigNumber[] = await ETHPool.getDepositIDs(user1.address);
    expect(indexes.length).to.equal(0);
    
    indexes = await ETHPool.getDepositIDs(user2.address);
    expect(indexes.length).to.equal(0);
  })
});

async function sendEtherToContract(amount: BigNumber, sender: SignerWithAddress, contract: string) {
  let request = {
    from: sender.address,
    to: contract,
    value: amount
  }
  await sender.sendTransaction(request);
}