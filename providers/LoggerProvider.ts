
const START = 1609459200000;
const DAYSIZE = 24 * 3600 * 1000;
const NEIGHBOURS: any = process.env.NEIGHBOURS || "NONE";

export = {
    initClient: function(client: any) {
        return new Promise<any>((resolve, reject) => {
            client.on('open', () => {
                client.on('message', (message: any) => {
                    message = message.toString();
                    let datum = JSON.parse(message);
                    if (datum.action === 'LOG') {
                        delete datum.payload.log._id;
                        if (datum.payload.log.timestamp >= client.from)
                            client.transactions.push(datum.payload.log);
                    } else if (datum.action === 'FINISHED') {
                        console.log("> finished");
                        client.resolve(sortLogs(client.transactions));
                    } else if (datum.action === 'EMPTY_ID') {
                        console.log("> EMPTY_ID: ", datum.payload.message);
                        client.resolve([]);
                    } else {
                        console.log("> unrecognizeable message: ", message);
                        client.resolve([]);
                    }
                });
                client.from = 0;
                resolve(true);
            });

            client.on('close', ()=>{
                console.log("closed ws");
            })
        });
    }, requestNextLogs: async function(client: any, executionId: any) {
        client.transactions = [];
        client.promise = new Promise((resolve, reject) => {
            client.resolve = resolve;
            client.reject = reject;
            client.send(executionId);
            console.log("> requesting:", executionId);
        });
        let logs = await client.promise;
        client.from = logs.length > 0 ? logs[logs.length - 1].timestamp : client.from;
        console.log("> logs:", logs.length);
        return logs;
    }, initDict(dict: any, logs: any, predictions: any, tokenIds: any) {
        console.log("> initializing dictionary");
        for (let log of logs) {
            let datum: any = extractData(log, predictions);
            datum.tokenId = log.tokenId;
            datum.sales = dict[log.tokenId] ? dict[log.tokenId].sales + 1 : 1;
            datum.history = dict[log.tokenId] ? dict[log.tokenId].history.concat(datum.history) : datum.history;
            tokenIds[datum.coords.x + "_" + datum.coords.y] = log.tokenId;
            datum.neighbours = [];
            dict[log.tokenId] = datum;
        }
        console.log("> finding neighbours");
        let keys = Object.keys(dict);
        for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
                let distance = calculateDistance(dict[keys[i]].coords, dict[keys[j]].coords);
                insertNeighbour(dict, keys[i], keys[j], distance);
                insertNeighbour(dict, keys[j], keys[i], distance);
            }
        }
    }, updateDict(dict: any, logs: any, predictions: any, tokenIds: any) {
        console.log("> updating dictionary");
        for (let log of logs) {
            let datum: any = extractData(log, predictions);
            datum.tokenId = log.tokenId;
            datum.sales = dict[log.tokenId] ? dict[log.tokenId].sales + 1 : 1;
            datum.history = dict[log.tokenId] ? dict[log.tokenId].history.concat(datum.history) : datum.history;
            tokenIds[datum.coords.x + "_" + datum.coords.y] = log.tokenId;
            let neighbours = getNeighbours(log.tokenId, datum, dict);
            dict[log.tokenId] = { ...datum, neighbours: neighbours };
        }
    }, getNeighbours: getNeighbours
}

function sortLogs(logs : any) {
    let ordered: any = [];
    for (let log of logs) {
        let index = findLogIndex(ordered, log);
        ordered.splice(index, 0, log);
    }
    return ordered;
}

function findLogIndex(logs: any, log: any) {
	if (logs.length == 0)
		return 0;
	let li = 0, lo = logs.length - 1;
	while (li < lo) {
		let mid = Math.floor((li + lo) / 2.0);
		if (logs[mid].timestamp < log.timestamp)
			li = mid + 1;
		else
			lo = mid;
	}
	return (logs[li].timestamp < log.timestamp) ? li + 1 : li;
}

function insertNeighbour(dict: any, keyA: any, keyB: any, distance: any) {
    if (dict[keyA].neighbours.length > 0) {
        let index: any = findIndex(dict[keyA].neighbours, distance);
        if (index < NEIGHBOURS)
            dict[keyA].neighbours.splice(index, 0, { tokenId: keyB, distance: distance });
        if (dict[keyA].neighbours.length > NEIGHBOURS)
            dict[keyA].neighbours = dict[keyA].neighbours.slice(0, NEIGHBOURS);
    } else
        dict[keyA].neighbours.push({ tokenId: keyB, distance: distance });
}

function extractData(log: any, predictions: any) {
    let date = parseInt(log.time.split(' ')[0].replace(/-/g, ''));
    let reference: any = {};
    for (let key of Object.keys(predictions))
        reference[key] = findPrediction(predictions[key], date);
    return {
        timestamp: log.timestamp,
        date: date,
        price: log.price,
        coords: log.coords,
        day: (log.timestamp - START) / DAYSIZE,
        reference: reference,
        landType: log.landType,
        owner: log.toProfile.name,
        history: [{
            timestamp: log.timestamp,
            time: log.time,
            price: log.price,
            priceUsd: log.priceUsd,
            owner: log.toProfile.name,
        }]
    };
}

function getNeighbours(tokenId: any, datum: any, dict: any) {
    let keys = Object.keys(dict), result: any = [];
    for (let key of keys)
        if (key !== tokenId) {
            let distance = calculateDistance(datum.coords, dict[key].coords);
            if (result.length > 0) {
                let index: any = findIndex(result, distance);
                if (index < NEIGHBOURS)
                    result.splice(index, 0, { tokenId: key, distance: distance });
            } else
                result.push({ tokenId: key, distance: distance });
        }
    let neighbours :any = [];
    for (let neighbour of result.slice(0, NEIGHBOURS))
        neighbours.push(neighbour);
    return neighbours;
}

function calculateDistance(pa: any, pb: any) {
    return Math.sqrt(((pa.x - pb.x) * (pa.x - pb.x)) + ((pa.y - pb.y) * (pa.y - pb.y)));
}

function findIndex(values: any, distance: any) {
    let li = 0, lo = values.length - 1;
    while (li < lo) {
        let mid = Math.floor((li + lo) / 2);
        if (values[mid].distance < distance)
            li = mid + 1;
        else
            lo = mid;
    }
    return values[li].distance < distance ? li + 1 : li;
}

function findPrediction(predictions : any, date: any) {
    let li = 0, lo = predictions.length - 1;
    while (li < lo) {
        let mid = Math.floor((li + lo) / 2.0);
        if (parseInt(predictions[mid].DATE) < date)
            li = mid + 1;
        else
            lo = mid;
    }
    return predictions[li].prediction['PREDICTED REFERENCE'];
}