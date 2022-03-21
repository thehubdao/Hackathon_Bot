import { OpenSeaProvider } from '../providers/OpenSeaProvider';
import { BackTestingProvider } from '../providers/BackTestingProvider';
import { MarketDataProvider } from '../utilities/TypesUtilities';


export class MarketManager {
    provider: MarketDataProvider;
    public static instance: MarketManager;

    constructor(providerName: string, contractAddress?: string){
        if(providerName == 'production') this.provider = OpenSeaProvider.getInstance(contractAddress);
        // else if(providerName == 'backtesting') this.provider = BackTestingProvider.getInstance(contractAddress);
        else this.provider = OpenSeaProvider.getInstance(contractAddress);
    }

    public static getInstance(providerName:string, contractAddress?: string){
        if(MarketManager.instance){
            return this.instance;
        }
        this.instance = new MarketManager(providerName, contractAddress);
        return this.instance;
    }

    getContractAddress(){
        return this.provider.getContractAddress();
    }
    
}