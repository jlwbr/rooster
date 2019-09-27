require("dotenv").config();
const Papa = require("papaparse");
const moment = require("moment");

var Airtable = require("airtable");
Airtable.configure({
  endpointUrl: "https://api.airtable.com",
  apiKey: process.env.API_KEY
});

const base = Airtable.base("appHWxFKBiCLRiJOu");

const statusCode = 200;
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "content-type": "application/json"
};

const dateExists = async date =>
  new Promise((resolve, reject) => {
    const dates = [];
    base("Dagplanning")
      .select({
        filterByFormula:
          'IS_SAME({Datum}, DATETIME_PARSE("' +
          date +
          '", "DD-MM-YYYY"), "day")',
        maxRecords: 1,
        view: "Overview"
      })
      .eachPage(
        function page(records, fetchNextPage) {
          // This function (`page`) will get called for each page of records.

          records.forEach(record => {
            dates.push({
              id: record.id,
              date: moment(record.get("Datum"))
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
          } else if (dates.length) {
            resolve(dates[0]);
          } else {
            resolve(false);
          }
        }
      );
  });

const createDayPlanning = async date =>
  new Promise((resolve, reject) => {
    const dates = [];
    base("Dagplanning").create(
      [
        {
          fields: {
            Datum: moment(date).format("YYYY-MM-DD"),
            Dagverdeling: [],
            Overdrachten: [],
            Aanwezig: []
          }
        }
      ],
      function(err, records) {
        if (err) {
          reject(err);
        }

        records.forEach(record => {
          dates.push({
            id: record.id,
            date: moment(record.get("Datum"))
          });
        });
        if (dates.length) {
          resolve(dates[0]);
        } else {
          resolve(false);
        }
      }
    );
  });

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

exports.handler = async function(event) {
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

  // Decode and parse incoming data
  const body = JSON.parse(event.body);
  const parsed = Papa.parse(decodeURIComponent(body.data), {
    header: true
  });

  const data = parsed.data;

  const dates = [...new Set(data.map(x => x.Dag).filter(Boolean))];
  const importedIDs = [...new Set(data.map(x => x["Persnr."]).filter(Boolean))];
  const Roster = [];

  const dayPlanningPromise = dates.map(async day => {
    const date = await dateExists(day).catch(err => {
      console.error(err);
    });
    if (date) {
      return (day = date);
    } else {
      const newDay = await createDayPlanning(moment(day, "DD-MM-YYYY")).catch(
        err => {
          console.error(err);
        }
      );
      return (day = newDay);
    }
  });

  const IDsPromise = importedIDs.map(async importedID => {
    const id = await getPersonalID(parseInt(importedID)).catch(err =>
      console.error(err)
    );
    if (id) {
      return (importedID = id);
    } else {
      return (importedID = null);
    }
  });

  const dayPlanning = await Promise.all(dayPlanningPromise);
  const uncleanIDs = await Promise.all(IDsPromise);
  const IDs = uncleanIDs.filter(Boolean);

  for (i in data) {
    const shift = data[i];
    const day = dayPlanning.find(Planning =>
      moment(Planning.date).isSame(moment(shift.Dag, "DD-MM-YYYY"))
    );
    const id = IDs.find(oldID => {
      return oldID.personalID === parseInt(shift["Persnr."])
    });
    if (id && day && shift) {
      Roster.push({
        fields: {
          Aanwezig: shift.Van + " - " + shift.Tot,
          "Kies naam": [id.id],
          Datum: [day.id]
        }
      });
    }
  }

  while(Roster.length) {
    await base("Aanwezigheid").create(Roster.splice(0,10), function(err, records) {
      if (err) {
        console.error(err);
        return;
      }
    });
  }

  return {
    statusCode: 200,
    headers,
    body: "Succes"
  };
};
