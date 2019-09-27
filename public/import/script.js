window.onload = function() {
  var fileInput = document.getElementById("fileInput");
  var fileDisplayArea = document.getElementById("fileDisplayArea");

  fileInput.addEventListener("change", function(e) {
    var file = fileInput.files[0];
    var http = new XMLHttpRequest();
    var url = "https://roosters.netlify.com/.netlify/functions/airtable";
    var textType = /text.*|application.*/;

    if (file.type.match(textType)) {
      var reader = new FileReader();

      reader.onload = function(e) {
        var data = {
          data: encodeURIComponent(reader.result)
        };
        console.log(data)
        http.open("POST", url, true);
        http.setRequestHeader("Content-type", "application/json");

        http.onreadystatechange = function() {
          //Call a function when the state changes.
          if (http.readyState == 4 && http.status == 200) {
            fileDisplayArea.innerText = http.responseText;
          }
		};
        http.send(JSON.stringify(data));
      };

      reader.readAsText(file);
    } else {
      fileDisplayArea.innerText = "File not supported!";
    }
  });
};
