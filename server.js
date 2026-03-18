const express = require("express");
const app = express();

app.use(express.json());

app.get("/api/v1/health", (req, res) => {
res.json({ status: "ok" });
});

app.post("/api/v1/dados", (req, res) => {
const dados = req.body;

console.log("Dados recebidos:");
console.log(dados);

res.json({ status: "recebido" });
});

app.get("/", (req, res) => {
res.send("HBG Cloud funcionando");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("Servidor rodando na porta " + PORT);
});
