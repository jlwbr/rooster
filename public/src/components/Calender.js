import React from "react"
import { useStaticQuery, graphql } from "gatsby"
import '../components/style.css'

const generateKey = (pre) => {
    return `${ pre }_${ new Date().getTime() }`;
}

function dates(current) {
  var week = []
  // Starting Monday not Sunday
  current.setDate(current.getDate() - current.getDay() + 1)
  for (var i = 0; i < 6; i++) {
    week.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return week
}

function getWeekNumber(d) {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  // Get first day of year
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  // Return array of year and week number
  return [d.getUTCFullYear(), weekNo];
}

const GenerateTableHeader = ({ week }) => {
  return week.map((key, index) => {
  return <th key={index}>{key.toLocaleDateString("nl-NL", { weekday: 'long' })}<br />{key.toLocaleDateString("nl-NL", { year: 'numeric', month: 'long', day: 'numeric' })}</th>
  })
}

const GenerateGroup = ({ values, week }) => {
  return values.map((name, index) => {
    const { cluster, names } = name //destructuring
    return (
      <React.Fragment>
        <tr key={generateKey(index)}>
          <td className="group" colSpan="7">{cluster}</td>
        </tr>
        <GenerateRow names={names} week={week} />
      </React.Fragment>
    )
  })
}

const GenerateRow = ({ names, week }) => {
  return names.map((name, index) => {
    const { naam, shifts } = name //destructuring
    return (
      <tr key={generateKey(index)} className="shifts">
        <td className="name">{naam}</td>
        <GenerateValues values={shifts} week={week} />
      </tr>
    )
  })
}

const findShift = (values, day) => {
  return values.find(value => {
    const date = new Date(value.datum)
    return date.getDate() === day.getDate()
  })
}

const GenerateValues = ({ values, week }) => {
  return week.map((day, index) => {
    const shift = findShift(values, day)
    if (shift) {
      console.log(shift)
      const { aanwezig, color, closing, register } = shift
      return <td className="shift" style={{ background: `${color}`, borderBottom: `2px solid ${register}` }} key={generateKey(index)}><center style={ closing ? { fontWeight: 'bold' } : { fontWeight: 'normal' } }>{aanwezig}</center></td>
    } else {
      return <td key={generateKey(index)}></td>
    }
  })
}

export default ({ date }) => {

    const data = useStaticQuery(graphql`
    query RosterQuery {
      shifts: allAirtable(
        filter: { table: { eq: "Aanwezigheid" } }
        sort: { fields: data___Datum, order: ASC }
      ) {
        nodes {
          data {
            Datum
            Aanwezig
            Naam
            Nummer
            Cluster
            BerekendeKleur
            Sluiten
            OnderstreeptKleur
          }
        }
      }
    }
  `)

  const shifts = data.shifts.nodes.map(shift => ({
    datum: shift.data.Datum[0],
    naam: shift.data.Naam,
    aanwezig: shift.data.Aanwezig,
    cluster: shift.data.Cluster,
    color: shift.data.BerekendeKleur,
    closing: shift.data.Sluiten,
    register: shift.data.OnderstreeptKleur
  }))
  const shiftsArr = Object.values(
    shifts.reduce((result, { datum, naam, aanwezig, cluster, color, closing, register }) => {
      // Create new group
      if (!result[naam])
        result[naam] = {
          naam,
          cluster,
          shifts: [],
        }
      // Append to group
      result[naam].shifts.push({
        datum,
        aanwezig,
        color,
        closing,
        register
      })
      return result
    }, {})
  )

  const clusterArr = Object.values(
    shiftsArr.reduce((result, { naam, cluster, shifts }) => {
      // Create new group
      if (!result[cluster])
        result[cluster] = {
          cluster,
          names: [],
        }
      // Append to group
      result[cluster].names.push({
        naam,
        shifts,
      })
      return result
    }, {})
  )

  const week = dates(new Date(date))
  return (
    <table id="students" border="1" width="100%">
      <tbody>
        <tr className="header">
          <th>{getWeekNumber(week[0])[1]}</th>
          <GenerateTableHeader week={week} />
        </tr>
        <GenerateGroup  values={clusterArr} week={week} />
      </tbody>
    </table>
  )
}
