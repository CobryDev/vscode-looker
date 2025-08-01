explore: sales_analysis {
  join: customers {
    sql_on: ${orders.customer_id} = ${customers.id} ;;
    relationship: many_to_one
  }

  join: products {
    sql_on: ${order_items.product_id} = ${products.id} ;;
    relationship: many_to_one
  }
}