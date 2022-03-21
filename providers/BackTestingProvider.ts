import Web3 from 'web3';
import { OpenSeaPort, Network, EventType } from 'opensea-js';
import { Asset, ActionTypes, MarketDataProvider } from '../utilities/TypesUtilities';
import axios from 'axios';
import ws from 'ws';
import { OrderSide } from 'opensea-js/lib/types';
import logger from '../providers/LoggerProvider'

export class BackTestingProvider extends MarketDataProvider {

    private socketConnection: any;
    private socketInitialized: any;
    private readerUrl: string = process.env.READER_URL || "wss://services.itrmachines.com/log-reader";

    private static instance: BackTestingProvider;

    providerUrl: string = 'https://mainnet.infura.io';
    contractAddress: any = process.env.CONTRACT_ADDRESS;

    provider: any;
    openSeaPort: any;
    
    private constructor(contractAddress?: string){
        super();
        this.contractAddress = contractAddress || this.contractAddress;
        this.provider = new Web3.providers.HttpProvider(this.providerUrl);
        this.openSeaPort = new OpenSeaPort(this.provider, { networkName: Network.Main });
        this.socketConnection = new ws(this.readerUrl);
        this.startSocketConnection();
    }

    async startSocketConnection(){
        this.socketInitialized = await logger.initClient(this.socketConnection);
    }

    static getInstance(contractAddress? :string){
        if(BackTestingProvider.instance){
            return this.instance;
        }
        this.instance = new BackTestingProvider(contractAddress);
        return this.instance;
    }

    getAssetsOfCollection(){
        return this.openSeaPort.api.getAsset({tokenAddress: this.contractAddress, tokenId: null});
    }

    getAssetOfCollection(tokenId: any){
        return this.openSeaPort.api.getAsset({tokenAddress: this.contractAddress, tokenId});
    }
        
    getPaymentTokens(arg0: { symbol: any; }) {
        return this.openSeaPort.api.getPaymentTokens(arg0);
    }

    createBuyOrder(asset: Asset, accountAddress: string, startAmount: any){
        return this.openSeaPort.createBuyOrder({ asset, accountAddress, startAmount });
    }

    createSellOrder(asset: Asset, accountAddress: string, startAmount: any,  expirationTime: any, endAmount? :any ){
        return this.openSeaPort.createSellOrder({ asset, accountAddress, startAmount, endAmount, expirationTime });
    }

    //returns { orders, count } 
    getOrdersForAssetId(tokenAddress: string, tokenId: string, side: OrderSide){
        return this.openSeaPort.api.getOrders({ asset_contract_address: tokenAddress, token_id: tokenId, side })
    }
    
    getOrdersForToken(assetContractAddress: string, side: OrderSide, paymentTokenAddress?: any){
        return this.openSeaPort.api.getOrders({ asset_contract_address: assetContractAddress, side})
    }


    clearOpenSeaportEvents(){
        return this.openSeaPort.removeAllListeners();
    } 

    getContractAddress() {
        return this.contractAddress;
    }

    getCollectionData(collectionSlug: string){
        return new Promise<any>((resolve, reject)=>{
            
        })
    }

    declareOpenSeaportEvents(dispatch: Function) {
        return new Promise<any>((resolve, reject)=>{
                try {
                    this.openSeaPort.addListener(EventType.TransactionCreated, ({ transactionHash, event }) => {
                        console.info({ transactionHash, event })
                        dispatch({ type: ActionTypes.SET_PENDING_TRANSACTION_HASH, hash: transactionHash, event })
                    })
                    this.openSeaPort.addListener(EventType.TransactionConfirmed, ({ transactionHash, event }) => {
                        console.info({ transactionHash, event })
                        // Only reset your exchange UI if we're finishing an order fulfillment or cancellation
                        if (event == EventType.MatchOrders || event == EventType.CancelOrder) {
                            dispatch({ type: ActionTypes.RESET_EXCHANGE, hash: transactionHash, event })
                        }
                    })
                    this.openSeaPort.addListener(EventType.TransactionDenied, ({ transactionHash, event }) => {
                        console.info({ transactionHash, event })
                        dispatch({ type: ActionTypes.RESET_EXCHANGE, hash: transactionHash, event })
                    })
                    this.openSeaPort.addListener(EventType.TransactionFailed, ({ transactionHash, event }) => {
                        console.info({ transactionHash, event })
                        dispatch({ type: ActionTypes.RESET_EXCHANGE, hash: transactionHash, event })
                    })
                    this.openSeaPort.addListener(EventType.InitializeAccount, ({ transactionHash, accountAddress, event }) => {
                        console.info({ accountAddress })
                        dispatch({ type: ActionTypes.INITIALIZE_PROXY, hash: transactionHash, accountAddress, event })
                    })
                    this.openSeaPort.addListener(EventType.WrapEth, ({ accountAddress, amount, transactionHash, event }) => {
                        console.info({ accountAddress, amount, transactionHash, event })
                        dispatch({ type: ActionTypes.WRAP_ETH })
                    })
                    this.openSeaPort.addListener(EventType.UnwrapWeth, ({ accountAddress, amount, transactionHash, event }) => {
                        console.info({ accountAddress, amount, transactionHash, event })
                        dispatch({ type: ActionTypes.UNWRAP_WETH })
                    })
                    this.openSeaPort.addListener(EventType.ApproveCurrency, ({ accountAddress, tokenAddress, transactionHash, event }) => {
                        console.info({ accountAddress, tokenAddress, transactionHash, event })
                        dispatch({ type: ActionTypes.APPROVE_WETH })
                    })
                    this.openSeaPort.addListener(EventType.ApproveAllAssets, ({ accountAddress, proxyAddress, tokenAddress, transactionHash, event }) => {
                        console.info({ accountAddress, proxyAddress, tokenAddress, transactionHash, event })
                        dispatch({ type: ActionTypes.APPROVE_ALL_ASSETS })
                    })
                    this.openSeaPort.addListener(EventType.ApproveAsset, ({ accountAddress, proxyAddress, tokenAddress, tokenId, transactionHash, event }) => {
                        console.info({ accountAddress, proxyAddress, tokenAddress, tokenId, transactionHash, event })
                        dispatch({ type: ActionTypes.APPROVE_ASSET })
                    })
                    this.openSeaPort.addListener(EventType.CreateOrder, ({ order, accountAddress, transactionHash, event }) => {
                        console.info({ order, accountAddress, transactionHash, event })
                        dispatch({ type: ActionTypes.CREATE_ORDER })
                    })
                    this.openSeaPort.addListener(EventType.OrderDenied, ({ order, accountAddress, transactionHash, event }) => {
                        console.info({ order, accountAddress, transactionHash, event })
                        dispatch({ type: ActionTypes.RESET_EXCHANGE })
                    })
                    this.openSeaPort.addListener(EventType.MatchOrders, ({ buy, sell, accountAddress, transactionHash, event }) => {
                        console.info({ buy, sell, accountAddress, transactionHash, event })
                        dispatch({ type: ActionTypes.FULFILL_ORDER })
                    })
                    this.openSeaPort.addListener(EventType.CancelOrder, ({ order, accountAddress, transactionHash, event }) => {
                        console.info({ order, accountAddress, transactionHash, event })
                        dispatch({ type: ActionTypes.CANCEL_ORDER })
                    })
                    resolve(true);
                } catch (error) {
                    console.log("error on event listener creation for opensea provider", error);
                    resolve(false);
                }
                
            }) 
        }

        async getHistoricalTransactions(){
            return new Promise<any>(async (resolve, reject)=>{



                let url = "https://services.itrmachines.com/";
                const options: any = {
                    method: 'GET',
                    headers: {Accept: 'application/json', 'X-API-KEY':  process.env.OPENSEA_API_KEY }
                };
                let res = await (await fetch(url, options)).json()
                .catch(err => {
                    console.error(err);
                        reject(err)
                });
            })
            
        }

        getOrdersForAssets(assetContractAddress: string, tokenIds: any[], side: OrderSide, paymentTokenAddress?: any, order_by?: any, limit?: any, order_direction?: any): Promise<any> {
            return new Promise<any>(async (resolve, reject)=>{
                if(this.socketInitialized){
                    let logs: any = await logger.requestNextLogs(this.socketConnection, '7752a2cc-676f-4c0f-881f-8bb6086ab7f22');
                    console.log("got logs", logs.length);
                    resolve(this.transfromLogsForBacktesting(logs));
                }
            })
        }

        transfromLogsForBacktesting(logs){
            let priceDict = {};
            let ordersArray: any = [];
            for (let i = 0; i < logs.length; i++) {
                const element = logs[i];
                if(priceDict[element.tokenId]) {
                    priceDict[element.tokenId].base_currency_price = element.price;
                } else {
                    priceDict[element.tokenId] = {
                        asset: {
                            token_id: element.tokenId
                        },
                        base_currency_price: element.price
                    }
                }
            }
            for (const key in priceDict) {
                if (Object.prototype.hasOwnProperty.call(priceDict, key)) {
                    ordersArray.push(priceDict[key]);
                }
            }
            return ordersArray;
        }

}
