import Web3 from 'web3';
import { Asset } from '../utilities/TypesUtilities'
import axios from 'axios';
import ws from 'ws';
import { timeStamp } from 'console';

export class WalletManager {
    
    expectedGasFeeCost : any = process.env.EXPECTED_GAS_FEE_COST || 0.01;
    maximumConcentrationRisk : any = process.env.MAX_CONCENTRATION_RISK || 0.05;
    baseCurrency: any = process.env.BASE_CURRENCY || "WETH";
    walletAddress : string = '';
    approvedTokens: any[]= [];
    defaultGasLimit : any = process.env.DEFAULT_GAS_LIMIT || 283000;
    minimumPercentageProfit: any = process.env.MINIMUM_PERCENTAGE_PROFIT || 0.06;
    web3 : any;
    providerAddress: any = process.env.WEB3_PROVIDER_ADDRESS || 'http://localhost:8454';
    fixedHedgingCosts: any = process.env.HEDGING_COSTS || 0;
    openSeaFees: any =  process.env.OPENSEA_FEES || 0.25;

    constructor() {
        let provider = new Web3.providers.HttpProvider(this.providerAddress);
        this.web3 = new Web3(provider);
    }

    getSpendingLimit(){
        return new Promise<any>((resolve, reject)=>{
           resolve(5000);
        });
    }

    getGasPriceAsGwei(){
        return new Promise<any>(async (resolve, reject)=>{
            //this will return the current market conditions on gwei
            let gasPriceInWei = await this.web3.eth.getGasPrice();
            const gasPriceInGwei = this.fromGweiToEth(gasPriceInWei);
            resolve(gasPriceInGwei);
        });
    }

    getGasFeePerAsset(asset){
        return new Promise<void>(async (resolve, reject)=>{
            //this will return the current market conditions on ETH per asset
            let gasPriceInGWei = await this.getGasPriceAsGwei();
            //console.log({gasPriceInGWei});
            const gasPriceInETH = this.fromGweiToEth(gasPriceInGWei * this.defaultGasLimit);
            asset.gasFee = gasPriceInETH;
            resolve();
        });
    }

    getHedginCosts(){
        return this.fixedHedgingCosts;
    }

    getCurrencyConversion(){
        return 0;
    }

    getMaxNetworkFee(){
        return new Promise<any>((resolve, reject)=>{
            resolve(1);
        });
    }

    getTradeSize(){
        return new Promise<any>(async (resolve, reject)=>{
            let mNF = await this.getMaxNetworkFee();
            resolve(mNF/this.expectedGasFeeCost)
        })
    }

    fromGweiToEth(value){
        return parseFloat(value)/ 10**9;
    }

    async getAssetGasFee(){
        //asset gas fee is expressed on eth because eth is main currency
        let gasPrice = await this.getGasPriceAsGwei();
        return this.fromGweiToEth(gasPrice * this.defaultGasLimit);
    }

    areFundsEnoughForOperation(profitableSellOrders: any){
        return new Promise<boolean>(async (resolve, reject)=>{
            let fundsAreEnough = false;
            let portfolioV = await this.getPortfolioValue();
            /* let gasPrice =  await this.getGasPriceAsGwei();
            let assetGasFee = this.fromGweiToEth(gasPrice * this.defaultGasLimit); */
            console.log("checking if funds are enough for operation", portfolioV, profitableSellOrders)

            for (let i = 0; i < profitableSellOrders.length; i++) {
                if(
                    this.isAssetTradeable(
                        profitableSellOrders[i].predicted_price,
                        portfolioV, 
                        profitableSellOrders[i].gasFee
                    )
                )
                {
                    profitableSellOrders[i].tradeable = true;
                    fundsAreEnough = true;
                }
            }
            resolve(fundsAreEnough);
        })
    }

    //useless ? maybe easier to call it direclty on the object
    getBestOrderPriceOfAsset(asset: any){
        return new Promise<any>((resolve, reject)=>{
            //get price of best order of asset
            //check if eth or if sand give the price in sand, always
            //should be extended so we can provide the main currency of the bot
            resolve(asset.predicted_price);
        })
    }

    getOpenseaFees() {
        return this.openSeaFees;
    }

    isAssetTradeable(assetPrice, portfolioValue, gasFees){
        return (assetPrice <= portfolioValue * this.maximumConcentrationRisk) && ( gasFees <= assetPrice * this.expectedGasFeeCost );
    }

    getPortfolioValue(){
        return new Promise<any>((resolve, reject)=>{
            //return value of portfolio on eth
            resolve(100);
        })
    }

    getConcentrationRisk(){
        return this.maximumConcentrationRisk;
    }

    async approvesRiskManagement(assetOrder: any): Promise<boolean>{
        console.log("risk", assetOrder.payment_token_contract.symbol, assetOrder.base_currency_price, this.getConcentrationRisk() * await this.getPortfolioValue());
        return (assetOrder.payment_token_contract.symbol === 'ETH'||  assetOrder.payment_token_contract.symbol === 'WETH')
               && (assetOrder.base_currency_price <= this.getConcentrationRisk() * await this.getPortfolioValue())
    }

    getProfitabilityThreshold(orderVolume){
        return this.minimumPercentageProfit * orderVolume;
    }
}