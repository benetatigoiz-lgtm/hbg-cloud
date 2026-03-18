const express = require("express");
const app = express();

app.use(express.json());

app.get("/api/v1/health", (req, res) => {
res.json({ status: "ok" });
});

app.get("/", (req, res) => {
res.send("HBG Cloud funcionando");
});

app.listen(3000, () => {
console.log("Servidor rodando na porta 3000");
});
