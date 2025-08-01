view: comprehensive_test {
  dimension: id {
    type: number
    sql: ${TABLE}.id ;;
  }

  dimension: name {
    type: string
    sql: ${TABLE}.name ;;
  }

  dimension: status {
    type: string
    sql: ${TABLE}.status ;;
  }

  measure: total_count {
    type: count
    drill_fields: [id, name]
  }

  measure: average_amount {
    type: average
    sql: ${TABLE}.amount ;;
  }

  filter: date_filter {
    type: date_time
  }

  parameter: time_period {
    type: unquoted
    allowed_values: {
      label: "Last 7 Days"
      value: "7"
    }
  }
}