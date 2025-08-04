view: malformed_test {
  dimension: missing_brace {
    type: string
    sql: ${TABLE}.field ;;
  }

  dimension: normal_field {
    type: number
    sql: ${TABLE}.id ;;
  }

  # Complete measure  
  measure: incomplete_measure {
    type: count
  }
}