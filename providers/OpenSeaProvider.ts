import Web3 from 'web3';
import { OpenSeaPort, Network, EventType } from 'opensea-js';
import { Asset, ActionTypes, MarketDataProvider } from '../utilities/TypesUtilities';
import { OrderSide } from 'opensea-js/lib/types';
const HDWalletProvider = require('@truffle/hdwallet-provider');

export class OpenSeaProvider extends MarketDataProvider {

    private static instance: OpenSeaProvider;
    private landLimit = 100;

    providerUrl: string = 'https://mainnet.infura.io';
    contractAddress: any = process.env.CONTRACT_ADDRESS;

    provider: any;
    localKeyProvider: any;
    openSeaPort: any;
    
    private constructor(contractAddress?: string){
        super();
        this.contractAddress = contractAddress || this.contractAddress;
        this.provider = new Web3.providers.HttpProvider(this.providerUrl);
        this.localKeyProvider = new HDWalletProvider({privateKeys: process.env.PRIVATE_KEYS, providerOrUrl: this.provider});
        this.openSeaPort = new OpenSeaPort(this.localKeyProvider, { networkName: Network.Main, apiKey: process.env.OPENSEA_API_KEY });
    }


    static getInstance(contractAddress? :string){
        if(OpenSeaProvider.instance){
            return this.instance;
        }
        this.instance = new OpenSeaProvider(contractAddress);
        
        return this.instance;
    }

    getAssetsOfCollection(){
        return new Promise<any>(async (resolve, reject)=>{
            let hasNext = true;
            let cursor ='';
            let lands: any = [];
            let index = 50;
            while(hasNext != null && index < this.landLimit){
                let r = await this.singleRequestOfAssets(cursor);
                lands = lands.concat(r.assets);
                cursor = r.next
                hasNext = r.next;
                index += r.assets.length;
            }
            let fSet = lands.filter((e: any)=>{ return e.sell_orders});
            resolve(fSet);
        })
        /* return this.openSeaPort.api.getAsset({tokenAddress: this.contractAddress, tokenId: null}); */
    }

    async singleRequestOfAssets(cursor){
        return new Promise<any>((resolve, reject)=>{
            let url = 'https://api.opensea.io/api/v1/assets?'
            +'asset_contract_address='+this.contractAddress
            +'&order_direction=desc'+
            '&cursor='+cursor+
            '&limit=50'+
            '&include_orders=true';
            const options: any = {
                method: 'GET',
                headers: {Accept: 'application/json', 'X-API-KEY':  process.env.OPENSEA_API_KEY }
            };
              
              fetch(url, options)
                .then(async response => {
                    let r = await response.json()
                    resolve(r)
                })
                .catch(err => {console.error(err); reject(err)});
        })
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
    getOrdersForAssetId(assetContractAddres: string, tokenId: string, side: OrderSide, paymentTokenAddress?: string){
        return this.openSeaPort.api.getOrders({ asset_contract_address: assetContractAddres, token_id: tokenId, side, payment_token_address: paymentTokenAddress })
    }

    getOrdersForAssets(assetContractAddress: string, tokenIds: any[], side: OrderSide, paymentTokenAddress?: any, order_by? :any, limit?:any, order_direction?: any){
        order_by = order_by || 'eth_price';
        order_direction = order_direction || 'asc';
        limit = limit || 1;
        return this.getOrdersAsRequest(tokenIds);
        //return this.openSeaPort.api.getOrders({ asset_contract_address: assetContractAddress, token_ids:tokenIds, payment_token_address: paymentTokenAddress, side, order_by, order_direction, limit, is_english: false})
    }

    getOrdersAsRequest(tokenIds: any[]){
        return new Promise<any>(async(resolve, reject)=>{
            let canContinue = true;
            let index = 0;
            let orders = [];
            console.log("getting orders from ", tokenIds.length);

            while(canContinue){
                let tokensString = '';
                let upperLimit = (tokenIds.length - index <0)? tokenIds.length - 1: index + 30;
                console.log("creating url for", index, upperLimit);
                for (let i = index; i < upperLimit; i++) {
                    tokensString += '&token_ids='+tokenIds[i];
                }

                let url = 'https://api.opensea.io/wyvern/v1/orders?'
                +'asset_contract_address='+this.contractAddress
                +'&is_english=false&bundled=false&include_bundled=false'
                +tokensString+'&side=1&sale_kind=0'
                '&limit=1&offset=0&order_by=eth_price&order_direction=asc';

                const options: any = {
                    method: 'GET',
                    headers: {Accept: 'application/json', 'X-API-KEY':  process.env.OPENSEA_API_KEY }
                };
                
                
                let res = await (await fetch(url, options)).json()
                .catch(err => {
                    console.error(err, res);
                     reject(err)
                });

                if(res.orders) {
                    console.log("orders got", orders);
                    orders = orders.concat(res.orders);
                }

                index += 30;
                if(tokenIds.length - index < 0) canContinue = false;
            }

            resolve(orders);

        })

    }
    
    getOrdersForToken(assetContractAddress: string, side: OrderSide, paymentTokenAddress?: any){
        return this.openSeaPort.api.getOrders({ asset_contract_address: assetContractAddress, payment_token_address: paymentTokenAddress, side})
    }


    clearOpenSeaportEvents(){
        return this.openSeaPort.removeAllListeners();
    } 

    getContractAddress(){
        return this.contractAddress;
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

    getCollectionData(collectionSlug: string): Promise<any> {
        return new Promise<any>(async (resolve, reject)=>{

            let url = 'https://api.opensea.io/api/v1/collection/'+collectionSlug;
            const options: any = {
                method: 'GET',
                headers: {Accept: 'application/json', 'X-API-KEY':  process.env.OPENSEA_API_KEY }
            };
            
            let res = await (await fetch(url, options)).json()
            .catch(err => {
                console.error(err);
                    reject(err)
            });
            resolve(res);
        })
    }

    fulfillOrder(order: any) {
        return new Promise<any>(async (resolve, reject)=>{
            
            const address = (await this.provider.eth.getAccounts())[0];
            const txHash = await this.openSeaPort.fulfillOrder({order, address});
            resolve(txHash);
        })
    }

}
