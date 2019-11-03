import React, { useState } from "react"
import useForm from "react-hook-form"

const sendFile = (file) => {
  var http = new XMLHttpRequest();
  var url = "https://roosters.netlify.com/.netlify/functions/airtable";
  var textType = /text.*|application.*/;

  if (file.type.match(textType)) {
    var reader = new FileReader();

    reader.onload = function(e) {
      var data = {
        data: encodeURIComponent(reader.result)
      };
      http.open("POST", url, true);
      http.setRequestHeader("Content-type", "application/json");

      http.onreadystatechange = function() {
        //Call a function when the state changes.
        if (http.readyState === 4 && http.status === 200) {
          console.log(http.responseText)
          alert(http.responseText);
        }
      };
      http.send(JSON.stringify(data));
    };

    reader.readAsText(file);
  } else {
    alert("Bestand niet ondersteund!");
  }
}


export default () => {
  const { register, handleSubmit, errors } = useForm()
  const [date, setDate] = useState();
  const onSubmit = data => {
    sendFile(data.file[0])
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* register your input into the hook by invoking the "register" function */}

        <label for="file">Week: </label>
        <input type="file" name="file" ref={register({ required: true })} id="file" />

        {/* errors will return when field validation fails  */}
        {errors.exampleRequired && <span>Dit veld is verplicht</span>}
        <input type="submit" />
      </form>
    </div>
  )
}
