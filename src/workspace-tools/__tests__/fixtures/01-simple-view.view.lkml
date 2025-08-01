# This is a test view
view: orders {
  dimension: id {
    type: number
    sql: ${TABLE}.id ;;
  }

  measure: count {
    type: count
  }
}