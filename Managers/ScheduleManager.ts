export class ScheduleManager {

    epoch: number = parseInt(''+process.env.W_EPOCH) || 90;
    bufferDays: number = parseInt(''+process.env.BUFFER_W_DAYS) || 5;

    bannedDates: any[]= [];
    timeout: any = {
        start: null,
        end: null,
        period: null
    };
    

    constructor() {}

    setBanedDates(){

    }

    getBanedDates(){

    }

    setTimeoutPeriod(){

    }

    getTimeoutPeriod(){

    }

    isOperationEnabledInCurrentTimeFrame(){
        return new Promise<boolean>(async (resolve, reject)=>{
            //check banned dates
            //check timeoutPeriod
            let iWP = this.isWithDrawingPeriod();
            let iTBD = this.isTodayABannedDate();
            let f = await Promise.all([iWP, iTBD]);
            resolve(f.every(v => v === true));
        });
    }

    isTodayABannedDate(){
        return new Promise<boolean>((resolve, reject)=>{
            for (let i = 0; i < this.bannedDates.length; i++) {
                const element = this.getDateObjFromBannedDate(this.bannedDates[i]);
                if(this.areDatesEqual(element, new Date())){
                    resolve(true);
                    break;
                }
            }
            resolve(false);
        })
    }

    getDateObjFromBannedDate(value: string){
        return new Date(value);
    }

    areDatesEqual(dateA: Date, dateB: Date){
        return dateA.valueOf() == dateB.valueOf()
    }


    isWithDrawingPeriod(){
        return new Promise<boolean>(async (resolve, reject)=>{
            let lastW = await this.getLastWithdrawingPeriod();
            let nextW = new Date();
            nextW.setDate(lastW.getDate() + this.epoch);
            let itIs: boolean = (nextW.getDate() - new Date().getDate()) > this.bufferDays;
            resolve(itIs)
        })
    }

    getNextWithdrawingPeriod(){
        return new Promise<any>(async (resolve, reject)=>{
            let lastW = await this.getLastWithdrawingPeriod();
            let nextW = new Date();
            nextW.setDate(lastW.getDate() + this.epoch);
            resolve(nextW);
        })
    }
    
    getLastWithdrawingPeriod(){
        return new Promise<any>((resolve, reject)=>{
            //load from file?
            // for now 90 days from the first day of the current month
            let today = new Date()
            let firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
            firstDayOfMonth.setDate(firstDayOfMonth.getDate() - this.epoch);
            resolve(firstDayOfMonth);
        })
    }


}