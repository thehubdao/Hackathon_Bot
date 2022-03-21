import { IOrderDict, Asset } from '../utilities/TypesUtilities';
import { WyvernSchemaName, OrderSide } from "opensea-js/lib/types";
import { MarketManager } from './MarketManager';


export class OrderManager {
    orders: IOrderDict = {};
    
    symbol: any;
    marketManager : MarketManager;
    paymentToken: any;

    constructor(symbol: string, provider: string,contractAddress?: string){
        this.marketManager =  MarketManager.getInstance(provider, contractAddress);
        this.symbol = symbol;
        this.setPaymentToken(symbol);
    }

    async setPaymentToken(symbol) {
        this.paymentToken = (await this.marketManager.provider.getPaymentTokens({ symbol })).tokens[0];
    }

    async getOrdersForToken(side: OrderSide, paymentTokenAddress?: any){
        return new Promise(async (resolve, reject)=>{
            const orders = await this.marketManager.provider.getOrdersForToken(this.marketManager.getContractAddress(), side, paymentTokenAddress);
            if(orders) resolve({status: true, orders});
            else resolve({status: false, orders});
        });
    }

    async getOrdersForAsset(side: OrderSide, paymentTokenAddress: any, tokenId: any){
        return new Promise(async (resolve, reject)=>{
            const orders = await this.marketManager.provider.getOrdersForAssetId( this.marketManager.getContractAddress(), tokenId, side, paymentTokenAddress);
            if(orders) resolve({status: true, orders});
            else resolve({status: false, orders});
        });
    }

    async getOrdersForAssets(side: OrderSide, paymentTokenAddress: any, tokenIds: any[]){
        return new Promise(async (resolve, reject)=>{
            const orders = await this.marketManager.provider.getOrdersForAssets( this.marketManager.getContractAddress(), tokenIds, side, paymentTokenAddress);
            if(orders) resolve({status: true, orders});
            else resolve({status: false, orders});
        });
    }

    async createBuyOrder(asset: Asset, price: any){
        return new Promise(async (resolve, reject)=>{
            if(!this.orders[asset.tokenId].buy){

            } else {
                resolve({status: false, msg:'Buy order already put on the market for asset '+asset.tokenId});
            }
        })
        
    }

    async createSellOrder(asset: Asset, price: any){
        return new Promise(async (resolve, reject)=>{
            if(!this.orders[asset.tokenId].sell){
                
            } else {
                resolve({status: false, msg:'Sell order already put on the market for asset '+asset.tokenId});
            }
        })   
    }
}