import { WyvernSchemaName, OrderSide } from "opensea-js/lib/types";

export interface IBuyOrderInterface {
    //buy details
    side: OrderSide;
    asset: Asset;
    price: any;
    status : string;
}

export interface ISellOrderInterface {
    //sell details
    side: OrderSide;
    asset: Asset;
    price: any;
    status : string;
}

export interface IOrderInterface {
    buy: IBuyOrderInterface;
    sell: ISellOrderInterface;
}

export interface IOrderDict {
    [key: string]: IOrderInterface
}

export interface Asset {
    // The asset's token ID, or null if ERC-20
    tokenId: string,
    // The asset's contract address
    tokenAddress: string,
    // The Wyvern schema name (defaults to "ERC721") for this asset
    schemaName?: WyvernSchemaName,
    // Optional for ENS names
    name?: string,
    // Optional for fungible items
    decimals?: number
}

export enum ActionTypes {
    SET_PENDING_TRANSACTION_HASH,
    RESET_EXCHANGE,
    INITIALIZE_PROXY,
    WRAP_ETH,
    UNWRAP_WETH,
    APPROVE_WETH,
    APPROVE_ALL_ASSETS,
    APPROVE_ASSET,
    CREATE_ORDER,
    FULFILL_ORDER,
    CANCEL_ORDER
}


export abstract class MarketDataProvider {
    
    /* private static instance: MarketDataProvider;

    public static getInstance(): MarketDataProvider {
        if(MarketDataProvider.instance == null){
            MarketDataProvider.instance = new MarketDataProvider();
        }

        return MarketDataProvider.instance;
    } */
    
    constructor(contractAddress?: string){}

    abstract getAssetsOfCollection() : Promise<any>;
    abstract getAssetOfCollection(tokenId: any) : Promise<any>;    
    abstract getPaymentTokens(arg0: { symbol: any; }) : Promise<any>;
    abstract createBuyOrder(asset: Asset, accountAddress: string, startAmount: any): Promise<any>;
    abstract createSellOrder(asset: Asset, accountAddress: string, startAmount: any,  expirationTime: any, endAmount? :any ): Promise<any>;
    abstract getOrdersForAssetId(assetContractAddres: string, tokenId: string, side: OrderSide, paymentTokenAddress?: string): Promise<any>;
    abstract getOrdersForAssets(assetContractAddress: string, tokenIds: any[], side: OrderSide, paymentTokenAddress?: any, order_by?:any , limit?:any, order_direction?: any): Promise<any>;
    abstract getOrdersForToken(assetContractAddress: string, side: OrderSide, paymentTokenAddress?: any): Promise<any>;
    abstract clearOpenSeaportEvents(): Promise<any>;
    abstract declareOpenSeaportEvents(dispatch: Function) : Promise<any>;
    abstract getContractAddress(): any;
    abstract getCollectionData(collectionSlug: string): Promise<any>;
}

export {OrderSide} from 'opensea-js/lib/types';