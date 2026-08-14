const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const USERS_FILE = path.join(__dirname, "users.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

function readJSON(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    }
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}

/* ACCUEIL */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ADMIN */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

/* CREER UN COMPTE */
app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Tous les champs sont obligatoires."
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Le mot de passe doit contenir au moins 6 caractères."
    });
  }

  const users = readJSON(USERS_FILE);

  const existing = users.find(
    user => user.email.toLowerCase() === email.toLowerCase()
  );

  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Ce compte existe déjà."
    });
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    password: hashPassword(password),
    balance: 0,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  writeJSON(USERS_FILE, users);

  res.json({
    success: true,
    message: "Compte créé avec succès.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance
    }
  });
});

/* CONNEXION */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const users = readJSON(USERS_FILE);

  const user = users.find(
    u =>
      u.email === String(email).toLowerCase() &&
      u.password === hashPassword(password)
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Email ou mot de passe incorrect."
    });
  }

  res.json({
    success: true,
    message: "Connexion réussie.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance
    }
  });
});

/* VOIR LE SOLDE */
app.get("/api/user/:id", (req, res) => {
  const users = readJSON(USERS_FILE);

  const user = users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Utilisateur introuvable."
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance
    }
  });
});

/* CREER UNE DEMANDE DE DEPOT */
app.post("/api/deposit", (req, res) => {
  const { userId, amount, method } = req.body;

  const numericAmount = Number(amount);

  if (!userId || !numericAmount || numericAmount <= 0 || !method) {
    return res.status(400).json({
      success: false,
      message: "Informations de dépôt invalides."
    });
  }

  const users = readJSON(USERS_FILE);

  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Utilisateur introuvable."
    });
  }

  const orders = readJSON(ORDERS_FILE);

  const deposit = {
    id: crypto.randomUUID(),
    type: "deposit",
    userId,
    amount: numericAmount,
    method,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  orders.push(deposit);
  writeJSON(ORDERS_FILE, orders);

  res.json({
    success: true,
    message: "Demande de dépôt enregistrée. Elle doit être vérifiée par l'administrateur.",
    deposit
  });
});

/* PASSER UNE COMMANDE */
app.post("/api/order", (req, res) => {
  const {
    userId,
    service,
    link,
    quantity,
    price
  } = req.body;

  const numericPrice = Number(price);
  const numericQuantity = Number(quantity);

  if (
    !userId ||
    !service ||
    !link ||
    !numericQuantity ||
    numericQuantity <= 0 ||
    !numericPrice ||
    numericPrice <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Informations de commande invalides."
    });
  }

  const users = readJSON(USERS_FILE);

  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Utilisateur introuvable."
    });
  }

  if (Number(user.balance) < numericPrice) {
    return res.status(400).json({
      success: false,
      message: "Solde insuffisant."
    });
  }

  user.balance -= numericPrice;

  writeJSON(USERS_FILE, users);

  const orders = readJSON(ORDERS_FILE);

  const order = {
    id: crypto.randomUUID(),
    type: "order",
    userId,
    service,
    link,
    quantity: numericQuantity,
    price: numericPrice,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  writeJSON(ORDERS_FILE, orders);

  res.json({
    success: true,
    message: "Commande enregistrée.",
    order,
    balance: user.balance
  });
});

/* COMMANDES D'UN CLIENT */
app.get("/api/orders/:userId", (req, res) => {
  const orders = readJSON(ORDERS_FILE);

  const userOrders = orders.filter(
    order =>
      order.userId === req.params.userId &&
      order.type === "order"
  );

  res.json({
    success: true,
    orders: userOrders
  });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
