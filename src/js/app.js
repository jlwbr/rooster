import '../styles/main.scss';
import "bootstrap";
import "responsive-bootstrap-tabs";
import "dragscroll"
var Airtable = require('airtable');
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: 'keydEl9Z5scHznutn'
});
var base = Airtable.base('app2IA0Bsp3pr9Syy');

function sortA(a, b) {
  const bandA = a.get('Medewerker') || "";
  const bandB = b.get('Medewerker') || "";

  const mtA = a.get('MT')
  const mtB = b.get('MT')

  let comparison = 0;
  if (mtA) {
    comparison = 1;
  } else if (mtB) {
    comparison = -1;
  } else if (bandA > bandB) {
    comparison = 1;
  } else if (bandA < bandB) {
    comparison = -1;
  }

  return comparison * -1;
}

function getUrlVars() {
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value;
  });
  return vars;
}

window.onload = function () {
  var fileInput = document.getElementById("fileInput");
  var container = document.getElementById("container");
  var loader = document.getElementById("loader");
  var fileDisplayArea = document.getElementById("fileDisplayArea");
  if (location.pathname.split("/").slice(-1) == ("print.html" || "print")) {
    base('Dagplanning').select({
      view: "Dagverdeling"
    }).eachPage(function page(records, fetchNextPage) {
      $('#day').text(records[0].get("Dag"))
      $('#weeknum').text(records[0].get("Week"))
      $('#date').text(records[0].get("DatumText"))
      $('#year').text(new Date().getFullYear())
      records.sort(sortA).forEach(function (record) {
        if (record.get('Medewerker')) {
          const Medewerker = record.get('Medewerker') || ""
          const ToDo = record.get('Te doen') || ""
          const Opmerkingen = record.get('Opmerkingen') || ""
          const Aanwezig = record.get('Aanwezig') || ""
          const Pauze = record.get('Pauze') || "-"
          let Telefoon = record.get('Telefoon') || "-"
          if (Telefoon == "- + Porto") {
            Telefoon = "Porto"
          }
          $('#' + record.get('Dagdeel')).after("<tr height=18 style='height:13.2pt; border:1.75px solid #cacaca;'><td height=18 class=xl7031011 width=86 style='height:13.2pt;width:65pt;'>" + Medewerker + "</td><td colspan=2 class=xl7031011 width=165 style='width:124pt'>" + ToDo + "</td><td colspan=3 class=xl7631011 width=184 style='width:138pt'>" + Opmerkingen + "</td><td colspan=2 class=xl7031011 width=105 style='width:79pt; font-size:7.0pt; text-align:center;'>" + Aanwezig + "</td><td class=xl7031011 width=79 style='width:59pt; text-align:center;'>" + Pauze + "</td><td colspan=2 class=xl7031011 width=105 style='width:78pt; text-align:center'>" + Telefoon + "</td></tr>");
          console.log('Retrieved', record.get('Medewerker'));
        }
      });
      fetchNextPage();

    }, function done(err) {
      if (err) { console.error(err); return; }
      if(getUrlVars()["print"] != 0) {
        window.print();
      }
    });
  }

  fileInput.addEventListener("change", function (e) {
    var file = fileInput.files[0];
    var http = new XMLHttpRequest();
    var url = window.location.origin + "/.netlify/functions/airtable";
    var textType = /text.*|application.*/;

    if (file.type.match(textType)) {
      loader.style.display = "block";
      container.style.display = "none";

      var reader = new FileReader();

      reader.onload = function (e) {

        var data = {
          data: encodeURIComponent(reader.result)
        };
        console.log(data)
        http.open("POST", url, true);
        http.setRequestHeader("Content-type", "application/json");

        http.onreadystatechange = function () {
          //Call a function when the state changes.
          if (http.readyState == 4 && http.status == 200) {
            loader.style.display = "none";
            container.style.display = "block";
            fileDisplayArea.innerText = http.responseText;
          }
          else if (http.readyState == 4) {
            loader.style.display = "none";
            container.style.display = "block";
            fileDisplayArea.innerText = "HTTP Error: " + http.status;
          }
        };
        http.send(JSON.stringify(data));
      };

      reader.readAsText(file);
    } else {
      fileDisplayArea.innerText = "Bestand niet ondersteund!";
    }
  });
};
