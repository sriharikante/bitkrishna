const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Web Service is working 🚀" });
});

app.post("/identify", (req, res) => {
  const { email, phoneNumber } = req.body;

  res.json({
    received: {
      email: email || null,
      phoneNumber: phoneNumber || null
    },
    status: "Test endpoint working"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
