# Description
Strategy class file is on charge of taking the trading decisions of the bot. For initiating the execution of the bot we use an index file which will create an instance of our strategy, we must provide 2 arguments, the first is the mode of operation, current supported methods are "backtesting"
and "production", the second argument is the contract address of the asset collection that we are to use as basis of the trading operation.

# Disclaimer
For testing purposes we will look for the first 300 nfts for trading oportunities. (OpenSea is very strict with the api request rate, and the sandbox land collection has more than 100000 assets).

Once we get all the current trading offers for every selected asset we proceed 
to make several things:

0. Set starting parameters of the bot (exploration range, risk setting, etc).
1. Get a list of profitable orders
    1.1 from the available orders we select the ones that have a price that is an undervaluation of the real value of the asset related to the current floor price. (The "real value" that we use is a price estimation of the asset made by an AI that we trained for this particular task, the current error ratio of the AI is less than 8%).
2. Check operative conditions of the bot.
    2.1 We check if the current date is a banned date for operation
    2.2 We check if the current date is outside of a withdrawing period of the current wallet.
    2.3 We check if we have enough funds for operate on the current available orders.
3. Fullfil the profitable orders, so we can later sell the assets at their profitable price


When we use backtesting mode we create a syntethic set of orders that we got from the historical trade
in Opensea marketplace, then we replay the buy orders on a ganache network.

# Run the bot

In a terminal run ts-node index.ts. To change the operation method, change the first argument on the strategy instance creation.

