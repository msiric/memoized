stripe trigger customer.subscription.created \
  --override "subscription:items.data[0].price.id=price_1PK2PlBOG7dj7GmqSD4oVnGw" \
  --override "subscription:items.data[0].price.nickname=Monthly" \
  --override "subscription:metadata.userId=1"


