require("dotenv").config();
const Papa = require("papaparse");
const moment = require("moment");

var Airtable = require("airtable");
Airtable.configure({
  endpointUrl: "https://api.airtable.com",
  apiKey: process.env.API_KEY
});

const base = Airtable.base("app2IA0Bsp3pr9Syy");

const statusCode = 200;
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "content-type": "application/json"
};

let status = "Succes"

const getPersonalID = async id =>
  new Promise((resolve, reject) => {
    const personalIDs = [];
    base("Medewerkers")
      .select({
        filterByFormula: '{Persoonsnummer} = "' + id + '"',
        maxRecords: 1,
        view: "Medewerkers"
      })
      .eachPage(
        function page(records, fetchNextPage) {
          // This function (`page`) will get called for each page of records.

          records.forEach(record => {
            personalIDs.push({
              id: record.id,
              personalID: record.get("Persoonsnummer")
            });
          });

          // To fetch the next page of records, call `fetchNextPage`.
          // If there are more records, `page` will get called again.
          // If there are no more records, `done` will get called.
          fetchNextPage();
        },
        function done(err) {
          if (err) {
            reject(err);
          } else if (personalIDs.length) {
            resolve(personalIDs[0]);
          } else {
            resolve(false);
          }
        }
      );
  });

exports.handler = async function (event) {
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

  // Delete old data
  let recordList = []

  base('Dagplanning').select({
    // Selecting the first 3 records in Dagverdeling:
    view: "Dagverdeling"
  }).eachPage(function page(records, fetchNextPage) {
    // This function (`page`) will get called for each page of records.

    records.forEach(function (record) {
      recordList.push(record.id)
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();
  }, function done(err) {
    if (err) { console.error(err); return; }
  });

  console.log("Deleting records")
  while (recordList.length) {
    await base('Dagplanning').destroy(recordList.splice(0, 10), function(err, deletedRecords) {
      if (err) {
        console.error(err);
        return;
      }
      console.log(' Deleted', deletedRecords.length, 'records');
    });
  }

  // Decode and parse incoming data
  const body = JSON.parse(event.body);
  const parsed = Papa.parse(decodeURIComponent(body.data), {
    header: true
  });

  const data = parsed.data;

  const importedIDs = [...new Set(data.map(x => x["Persnr."]).filter(Boolean))];
  const Roster = [];

  const IDsPromise = importedIDs.map(async importedID => {
    const id = await getPersonalID(parseInt(importedID)).catch(err => {
      console.error(err)
      status = err
    });
    if (id) {
      return (importedID = id);
    } else {
      return (importedID = null);
    }
  });

  const uncleanIDs = await Promise.all(IDsPromise);
  const IDs = uncleanIDs.filter(Boolean);

  for (i in data) {
    const shift = data[i];
    const day = moment(shift.Dag, "DD-MM-YYYY")
    const id = IDs.find(oldID => {
      return oldID.personalID === parseInt(shift["Persnr."])
    });

    console.log("Adding Shift data: ", day, "for employee: ", id)
    if (id && day && shift && shift.Tot != "00:00") {
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
        console.error(err);
        status = err
        return;
      }
    });
  }

  return {
    statusCode: 200,
    headers,
    body: status
  };
};