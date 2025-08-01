# Main orders view for sales analysis
view: orders_with_comments {
  # Primary key
  dimension: id {
    primary_key: yes
    type: number
    sql: ${TABLE}.id ;;
  }

  // Customer information
  dimension: customer_id {
    type: number
    sql: ${TABLE}.customer_id ;;
  }

  # This is a measure for counting orders
  measure: order_count {
    type: count
    label: "Total Orders"
  }

  // Revenue calculations
  measure: total_revenue {
    type: sum
    sql: ${TABLE}.amount ;;
  }
}