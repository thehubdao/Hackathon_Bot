import { of, Observable, Subject  } from "rxjs"; 
import { MarketManager } from "./marketManager";

export class EventManager {

    private emitter : Subject<any>;
    private marketManager: MarketManager;
    private eventDict: any = {};

    constructor(providerName: string, contractAddres?: string) {
        this.emitter = new Subject();
        this.emitter.subscribe({
            next: (v) => { this.internalProcessOfNewEvent(v)}
        })
        this.marketManager = MarketManager.getInstance(providerName, contractAddres);
    }

    initializeEventManager(){
        this.marketManager.provider.clearOpenSeaportEvents();
        this.marketManager.provider.declareOpenSeaportEvents(this.emitter.next);
    }

    internalProcessOfNewEvent(event : any){
        //logging of external event
        this.eventDict[event.transactionHash] = event;
    }
}