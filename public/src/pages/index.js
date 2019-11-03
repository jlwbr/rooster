import React, { useState, useRef } from "react"
import useForm from "react-hook-form"
import ReactToPrint from 'react-to-print';

import Calender from "../components/Calender"

import "../components/style.css"

function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return number;
}

class PrintArea extends React.Component {
  render() {
    return (
      <div>
        <Calender date={this.props.date} />
        <i>Opgehaald op: {new Date().toLocaleString()}</i>
      </div>
    )
  }
}


export default () => {
  const { register, handleSubmit, errors } = useForm()
  const today = new Date()
  const datestring = pad(today.getFullYear()) + "-" + pad(today.getUTCMonth() + 1) + "-" + pad(today.getUTCDate())
  const [date, setDate] = useState(datestring);
  const componentRef = useRef();
  const onSubmit = data => {
    setDate(data.week)
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* register your input into the hook by invoking the "register" function */}

        <label for="week">Week: </label>
        <input id="week" type="date" name="week" ref={register({ required: true })} />

        {/* errors will return when field validation fails  */}
        {errors.exampleRequired && <span>Dit veld is verplicht</span>}
        <input type="submit" />
      </form>
      <ReactToPrint
        trigger={() => <button className="printbutton">Print</button>}
        content={() => componentRef.current}
      />
      <br />
      <PrintArea date={date} ref={componentRef} />
    </div>
  )
}
