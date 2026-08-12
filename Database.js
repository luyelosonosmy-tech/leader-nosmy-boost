const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "orders.json");

function getOrders() {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const data = fs.readFileSync(filePath, "utf8");

  if (!data.trim()) {
    return [];
  }

  return JSON.parse(data);
}

function saveOrders(orders) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(orders, null, 2),
    "utf8"
  );
}

function addOrder(order) {
  const orders = getOrders();

  const newOrder = {
    id: Date.now(),
    date: new Date().toISOString(),
    ...order
  };

  orders.push(newOrder);
  saveOrders(orders);

  return newOrder;
}

module.exports = {
  getOrders,
  saveOrders,
  addOrder
};
