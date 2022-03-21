import { WalletManager } from "./Managers/WalletManager";
import { ScheduleManager } from "./Managers/ScheduleManager";
import { MarketManager } from "./Managers/MarketManager";
import { OrderManager } from "./Managers/OrderManager";

export class Strategy {
    predictionDifferenceLimit: any;
    floorPriceMaximumDifference: any;
    currentCollectionData: any;

    providerName: string;
    contractAddress: string | void;
    currentGasPrice: any;

    walletManager : WalletManager;
    scheduleManager : ScheduleManager;
    marketMananger: MarketManager;
    ordersManager: OrderManager;
    
    profitableSellOrders: any;
    activeSellOrders: any;

    //should have an initialization contract
    constructor(provider: string, contractAddress?: string) {
        this.providerName = provider;
        this.contractAddress = contractAddress || process.env.CONTRACT_ADDRESS;
        this.walletManager = new WalletManager();
        this.scheduleManager = new ScheduleManager();
        this.marketMananger = new MarketManager(provider, contractAddress);
        this.ordersManager = new OrderManager('WETH', provider, contractAddress);

        this.initializeStrategy();
    }

    async initializeStrategy(){
        //initialization
        this.getStartingValues();
        //this.susbcribeToEvents();
        //this.operate();

        console.log("initializing" , new Date().toISOString());
 
        //168500
        let tokenIds = Array.from(Array(300).keys());
        this.activeSellOrders = await this.marketMananger.provider.getOrdersForAssets('',tokenIds,1);
        //console.log("got lands", new Date().toISOString(), this.availableAssets.length, { i: this.availableAssets[0].sell_orders[0].metadata, s: this.availableAssets[0].sell_orders});
        console.log("gottem", new Date().toISOString(), this.activeSellOrders.length);
        this.operate();       
    }

    susbcribeToEvents(){
        //process events 
    }

    processEvents(){
        //once we get connection state we operate
        this.operate();
    }

    async operate(){
        //internal clock -> check conditions use callback

        //check if we can operate
        //assets that already passed the check of profitability ordered the MGH score for lands
        this.profitableSellOrders = await this.getProfitableOrders();
        if(await this.checkOperativeFlags()){
            //we should have profitable lands with tradeable status and gas fees per land
            console.log("got profitable Assets", this.profitableSellOrders);
            const AssetsBought = this.fulfillOrders();
            
        } else {
            //report what?
        }
        
    }

    async fulfillOrders(){
        for (let i = 0; i < this.profitableSellOrders.length; i++) {
            //send individual orders or bulk
            this.profitableSellOrders[i];   
        }
    }

    getGasPrice(){
        return new Promise<any>(async (resolve, reject)=>{
            resolve(0);
        })
    }

    //add interface asset
    async approvesRiskManagement(assetOrder: any): Promise<boolean>{
        return this.walletManager.approvesRiskManagement(assetOrder);
    }


    getProfitableOrders(){
        return new Promise<any>(async (resolve, reject)=>{
            let pOrders: any = []
            for (let i = 0; i < this.activeSellOrders.length; i++) {
                //else we assume that base_currency_price already exists
                if(this.activeSellOrders[i].current_price){
                    const s= this.activeSellOrders[i].current_price.substring(0, this.activeSellOrders[i].current_price.indexOf('.'))
                    this.activeSellOrders[i].base_currency_price = parseFloat(s.slice(0,s.length - 18) + '.' + s.slice(s.length - 18));
                }
                
                // either return or set as property of asset
                await this.walletManager.getGasFeePerAsset(this.activeSellOrders[i]);
                let isAssetOperatable = await this.checkOperativeFlagsForOrder(this.activeSellOrders[i]);
                console.log(">>> "+ this.activeSellOrders[i].asset.token_id, "bcp: "+this.activeSellOrders[i].base_currency_price, "fp: "+this.currentCollectionData.collection.stats.floor_price, "gF: "+this.activeSellOrders[i].gasFee, 'operable: '+isAssetOperatable);
                if(isAssetOperatable){
                    let isProfitable = await this.isOrderProfitable(this.activeSellOrders[i]);
                    this.printCurrentAvailableOrders(this.activeSellOrders[i]);
                    if(isProfitable) pOrders.push(this.activeSellOrders[i]);
                } else {
                    let isProfitable = await this.isOrderProfitable(this.activeSellOrders[i]);
                    console.log("asset is not operable" +this.activeSellOrders[i].asset.token_id,  isAssetOperatable , "profitable ? "+isProfitable, this.activeSellOrders[i].estimatedProfit + " % "+ this.activeSellOrders[i].estimatedProfitPercentage);
                }
            }
            resolve(pOrders);
        })
    }

    printCurrentAvailableOrders(asset){
        console.log(">> "+asset.asset.token_id, asset.base_currency_price, asset.gasFee)
    }

    async checkOperativeFlagsForOrder(order){
        let flags =  (await Promise.all([
            this.isOrderInsideFloorPriceRange(order),
            this.approvesRiskManagement(order),
            this.isOrderValid(order)
        ]))
        console.log("operative flags", flags);
        return  flags.every(f => f === true)
    }

    async isOrderValid(order){
        return new Promise<boolean>(async (resolve, reject)=>{
            resolve(order.side === 1  && order.sale_kind === 0)
        });
    }

    async isOrderInsideFloorPriceRange(order){
        return new Promise<boolean>(async (resolve, reject)=>{
            try {
                let floorPrice = this.currentCollectionData.collection.stats.floor_price || (await this.getCurrentCollectionData()).collection.stats.floor_price;
                let difference = ((order.base_currency_price - floorPrice) * 100 ) / floorPrice;
                console.log(">>> "+order.asset.token_id,"fp: " + floorPrice, "d: "+ difference)
                resolve((difference/100) <= this.floorPriceMaximumDifference);
            } catch (error){
                console.log("error getting floor data", error);
                resolve(false);
            }
        })
    }
    
    //interface for asset
    async isOrderProfitable(order: any): Promise<boolean>{
        return new Promise<boolean>(async (resolve, reject)=>{
            order.estimatedProfit = await this.calculateProfit(order);
            order.estimatedProfitPercentage = order.estimatedProfit / order.base_currency_price;
            console.log(">>> "+order.asset.token_id, "profit: "+order.estimatedProfit, "profit %: "+order.estimatedProfitPercentage, "predicted price: "+order.predicted_price);
            resolve(order.estimatedProfitPercentage >= this.walletManager.getProfitabilityThreshold(order.base_currency_price));
        })
    }

    async calculateProfit(order){
        let fairValuation = await this.getFairValuationOfAsset(order);
        let buyPrice = order.base_currency_price;
        let openSeaFees = this.walletManager.getOpenseaFees();
        let hedgingCosts = this.walletManager.getHedginCosts();
        let currencyConversionCosts = this.walletManager.getCurrencyConversion();

        return    (fairValuation - buyPrice) 
                - (buyPrice + fairValuation) * openSeaFees                  //calculate total fees that will be paid
                - (order.gasFee - hedgingCosts - currencyConversionCosts)

    }

    async getFairValuationOfAsset(asset){
        return new Promise<any>( async (resolve, reject)=>{
            //call api valuation
            let url = 'https://services.itrmachines.com/'+(process.env.PREDICTION_ROUTE || 'sandbox/predict')+'?tokenId='+asset.asset.token_id
            const options: any = {
                method: 'GET',
                headers: {Accept: 'application/json', 'X-API-KEY':  process.env.OPENSEA_API_KEY }
            };
            let res = await (await fetch(url, options)).json()
            .catch(err => {
                console.error(err);
                    reject(err)
            });
            asset.predicted_price = res.prices.predicted_price;
            resolve(res.prices.predicted_price);
        })
    }


    isWithDrawingPeriod(){
        return new Promise<any>(async (resolve, reject)=>{
            resolve(true);
        })
    }

    async checkOperativeFlags(){
        return (await Promise.all([
            this.scheduleManager.isOperationEnabledInCurrentTimeFrame(),
            this.walletManager.areFundsEnoughForOperation(this.profitableSellOrders)
        ])).every(f => f === true)
    }

    async getOffersPerAsset(assets: any[]){
        for (let i = 0; i < assets.length; i++) {
            //assets[i].orders = await this.ordersManager.getOrdersForAsset( OrderSide.Sell, this., assets[i].token_id);
            
        }
    }

    async getStartingValues(){
        //we get funds data
        this.predictionDifferenceLimit = process.env.PREDICTION_D_LIMIT || 0.2;
        this.floorPriceMaximumDifference =  process.env.FLOOR_PRICE_D_LIMIT || 0.2;
        this.currentCollectionData =  await this.getCurrentCollectionData();
    }

    async getCurrentCollectionData(){
        let collectionSlug = process.env.COLLECTION_SLUG || 'sandbox';
        let d = await this.marketMananger.provider.getCollectionData(collectionSlug)
        this.currentCollectionData = d;
        return d;
    }
}