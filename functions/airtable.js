require("dotenv").config();

const Papa = require("papaparse");
const moment = require("moment");

var Airtable = require("airtable");
Airtable.configure({
    endpointUrl: "https://api.airtable.com",
    apiKey: process.env.API_KEY
});

const base = Airtable.base("app2IA0Bsp3pr9Syy");
const trackingid = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "content-type": "application/json"
};

let status = "Succes"

const removeOldData = new Promise((resolve,reject) => {
    base('Dagplanning').select({
        view: "Rooster"
    }).all().then(async records => {
        const recordList = records.map(record => record.id)
        while (recordList.length) {
            await base('Dagplanning').destroy(recordList.splice(0, 10), function (err, deletedRecords) {
                if (err) {
                    status = err + "\n request ID: " + context.awsRequestId
                    console.error(err);
                    return;
                }
                console.log('Deleted', deletedRecords.length, 'records');
            });
        }
        resolve();
    }).catch(err => {
        if (err) {
            status = err + "\n request ID: " + context.awsRequestId
            console.error(err);
            return;
        }
        reject(err)
    })
});

const CreateNewData = async (data) => {
    await base('Medewerkers').select({
        view: "Medewerkers"
    }).all().then(async records => {
        let Roster = []

        for (i in data) {
            const shift = data[i];
            const day = moment(shift.Dag, "DD-MM-YYYY")
            const id = records.find(record => record.get("Persoonsnummer") === parseInt(shift["Persnr."]))

            if (id && day && shift && shift.Tot != "00:00") {
                console.log("Adding Shift data: " + shift.Dag + " for employee: " + shift["Persnr."])

                if (moment(shift.Van, "HH:mm").isBefore(moment("13:00", "HH:mm"))) {
                    Roster.push({
                        fields: {
                            Aanwezig: shift.Van + " - " + shift.Tot,
                            MDW: [id.id],
                            Datum: moment(day).format("YYYY-MM-DD"),
                            Dagdeel: "Ochtend",
                        }
                    });
                    console.log("   Its an morning shift!")
                }
                if (moment(shift.Van, "HH:mm").isBetween(moment("13:00", "HH:mm"), moment("16:59", "HH:mm")) || (moment(shift.Tot, "HH:mm").isAfter(moment("13:00", "HH:mm")) && !moment(shift.Van, "HH:mm").isSameOrAfter(moment("17:00", "HH:mm")))) {
                    Roster.push({
                        fields: {
                            Aanwezig: shift.Van + " - " + shift.Tot,
                            MDW: [id.id],
                            Datum: moment(day).format("YYYY-MM-DD"),
                            Dagdeel: "Middag",
                        }
                    });
                    console.log("   Its an afternoon shift!")
                }
                if (moment(shift.Van, "HH:mm").isAfter(moment("17:00", "HH:mm")) || moment(shift.Tot, "HH:mm").isAfter(moment("17:00", "HH:mm"))) {
                    Roster.push({
                        fields: {
                            Aanwezig: shift.Van + " - " + shift.Tot,
                            MDW: [id.id],
                            Datum: moment(day).format("YYYY-MM-DD"),
                            Dagdeel: "Avond",
                        }
                    });
                    console.log("   Its an evening shift!")
                }
            }
        }
        while (Roster.length) {
            console.log("Creating records")
            await base("Dagplanning").create(Roster.splice(0, 10), function (err, records) {
                if (err) {
                    status = err + "\n request ID: " + context.awsRequestId
                    console.error(err);
                    return;
                }
            });
        }
    }).catch(err => {
        if (err) {
            status = err + "\n request ID: " + context.awsRequestId
            console.error(err);
            return;
        }
    })
}

const parseCSV = (document) => {
    const parsed = Papa.parse(document, {
        header: true
    });

    return parsed.data;
}

exports.handler = async function (event, context, callback) {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 200, // <-- Important!
            headers,
            body: JSON.stringify({
                status: "This was not a POST request!"
            })
        };
    }

    if (event.body === null || event.body === undefined) {
        return {
            statusCode: 200, // <-- Important!
            headers,
            body: JSON.stringify({
                status: "Missing data!"
            })
        };
    }
    
    const body = JSON.parse(event.body)
    const data = parseCSV(decodeURIComponent(body.data))


    removeOldData().then(() => {
        CreateNewData(data)
    })

    return {
        statusCode: 200,
        headers,
        body: status
    };
}