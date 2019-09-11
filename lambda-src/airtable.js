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

let days = []

const CreateDayPlanning = async (dates) => {
  let foundDates = [];

  await base("Dagplanning")
    .select()
    .all()
    .then(records => {
      records.forEach(record => {
        foundDates.push({
          id: record.id,
          date: moment(record.get("Datum"))
        });
      });
    })
    .catch(err => {
      console.error(err);
    });

  const created = foundDates.filter(foundDate =>
    dates.find(date => moment(date).isSame(foundDate.date))
  );

  const notCreated = dates
    .filter(
      date => !foundDates.find(foundDate => moment(foundDate.date).isSame(date))
    )
    .filter(value => value.isValid());

  if (notCreated && notCreated.length) {
    notCreated.forEach(date => {
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
        }
      );
    });
  } else {
    days = created.map(item => {
      return {
        id: item.id,
        date: item.date,
        index: dates.findIndex(date => date.isSame(item.date))
      };
    });
  }
};

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

  let body = JSON.parse(event.body);
  const parsed = Papa.parse(body.data);

  const data = parsed.data;

  const dates = data[1].slice(1).map(date => {
    return moment(date, "DD-MM-YYYY");
  });

  const people = data.filter(value => {
    return value[0].match("^[0-9]{4,4}$");
  });
  
  await CreateDayPlanning(dates)

  let personalids = []

  await base("Medewerkers")
  .select()
  .all()
  .then(records => {
    records.forEach(record => {
      personalids.push({
        uid: String(record.get('Persoonsnummer')),
        rid: record.id
      });
    });
  })
  .catch(err => {
    console.error(err);
  });

  days.forEach(day => {
    people.forEach(person => {
      const id = personalids.find(record => record.uid === person[0])
      const times = person[day.index + 2]
      if(times === "" || times === "Vakantie" || times === "ziek" || times === "vrij") return;
      if(!id) return;
      if(!id.rid) return;
      base('Aanwezigheid').create([
        {
          "fields": {
            "Aanwezig": times,
            "Kies naam": [
              id.rid
            ],
            "Datum": [
              day.id
            ]
          }
        },
      ], function(err, records) {
        if (err) {
          console.error(err);
          return;
        }
        return;
      });
  })
})

  return {
    statusCode,
    headers,
    body: JSON.stringify({
      status: "Succes"
    })
  };
};
