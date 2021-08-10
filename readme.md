# ETHPOOL

Author: Tyler Goodman (technicallyty)

## ENV files
Ensure you have properly set up a .env file in the project directory. The fields needed are: 
- PRIVATE_KEY : the private key with the account you wish to use
- ETHPOOL_ADDRESS : the address of the ETHPool contract (on goerli: 0x1fE76602Af0ef1fa9315897b3765EEd3795C8ca5)
- GOERLI_RPC_URL : the RPC you wish to use with the GOERLI test net where my deployment lives

### Contract

This contract is live on the Goerli Testnet at 0x1fE76602Af0ef1fa9315897b3765EEd3795C8ca5.

### Features
I've included a few hardhat tasks inside the hardhat config file.


#### Deploy
Simply deploys the ETHPool contract. Ensure the desired network is set in the config and the network flag is passed with the coressponding value. 

#### Deposit
Deposits funds to the ETHPool contract. Use the --amount flag to set the desired amount of funds you wish to send, and the --units flag to set the units you wish to send in (ie ether, wei, gwei, finney etc...). Please make sure to have the --network flag set to the network which has the deployed contract.

#### Balance
Simply gets the balance of ether in the ETHPool contract. Please ensure the --network flag is set.