view: malformed_test {
  dimension: missing_brace {
    type: string
    sql: ${TABLE}.field
  # Missing closing brace

  dimension: normal_field {
    type: number
    sql: ${TABLE}.id ;;
  }

  # Incomplete measure
  measure: incomplete_measure
    type: count
  }
}