const express = require("express");
const app = express();

app.use(express.json());

// guarda histórico em memória
// depois a gente troca por banco
const historico = [];
const LIMITE_HISTORICO = 500;

function normalizarNumero(v, padrao = 0) {
const n = Number(v);
return Number.isFinite(n) ? n : padrao;
}

function normalizarBool(v) {
if (typeof v === "boolean") return v;
if (typeof v === "number") return v === 1;
if (typeof v === "string") {
const s = v.toLowerCase();
return s === "true" || s === "1" || s === "on" || s === "sim";
}
return false;
}

app.get("/api/v1/health", (_req, res) => {
res.json({ status: "ok" });
});

app.post("/api/v1/dados", (req, res) => {
const body = req.body || {};

const item = {
timestamp: new Date().toISOString(),
temperatura: normalizarNumero(body.temperatura, -127),
compressor: normalizarBool(body.compressor),
agitador: normalizarBool(body.agitador),
modo: body.modo || "DESCONH.",
taxa_resfriamento: normalizarNumero(body.taxa_resfriamento, 0),
previsao_3c_min: normalizarNumero(body.previsao_3c_min, 0),
resfriamento_lento: normalizarBool(body.resfriamento_lento),
falha_resfriamento: normalizarBool(body.falha_resfriamento),
alarme_agitador: normalizarBool(body.alarme_agitador),
datahora: body.datahora || "",
ip: body.ip || "",
dispositivo: body.dispositivo || "HBG-0001"
};

historico.push(item);
if (historico.length > LIMITE_HISTORICO) {
historico.shift();
}

console.log("Dados recebidos:");
console.log(item);

res.json({
status: "recebido",
total_registros: historico.length
});
});

app.get("/api/v1/ultimos", (_req, res) => {
const ultimos = historico.slice(-100);
res.json(ultimos);
});

app.get("/api/v1/ultimo", (_req, res) => {
if (historico.length === 0) {
return res.json({
status: "sem_dados"
});
}

res.json(historico[historico.length - 1]);
});

app.get("/", (_req, res) => {
res.send("HBG Cloud funcionando");
});

app.get("/dashboard", (_req, res) => {
res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>HBG Cloud Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
body{
font-family: Arial, sans-serif;
margin:0;
background:#f4f6f8;
color:#222;
}
header{
background:#0b57d0;
color:#fff;
padding:16px 20px;
}
main{
max-width:1100px;
margin:20px auto;
padding:0 16px;
}
.grid{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
gap:16px;
margin-bottom:20px;
}
.card{
background:#fff;
border-radius:12px;
padding:16px;
box-shadow:0 2px 10px rgba(0,0,0,.08);
}
.titulo{
font-size:14px;
color:#666;
margin-bottom:8px;
}
.valor{
font-size:28px;
font-weight:bold;
}
.ok{color:green;font-weight:bold;}
.alerta{color:red;font-weight:bold;}
.lento{color:#d48806;font-weight:bold;}
canvas{
background:#fff;
border-radius:12px;
padding:16px;
box-shadow:0 2px 10px rgba(0,0,0,.08);
}
table{
width:100%;
border-collapse:collapse;
margin-top:20px;
background:#fff;
border-radius:12px;
overflow:hidden;
box-shadow:0 2px 10px rgba(0,0,0,.08);
}
th, td{
padding:10px;
border-bottom:1px solid #eee;
text-align:left;
font-size:14px;
}
</style>
</head>
<body>
<header>
<h1>HBG Cloud Dashboard</h1>
<div>Monitoramento do tanque de leite</div>
</header>

<main>
<div class="grid">
<div class="card">
<div class="titulo">Temperatura</div>
<div class="valor" id="tempAtual">--</div>
</div>
<div class="card">
<div class="titulo">Modo</div>
<div class="valor" id="modoAtual" style="font-size:22px;">--</div>
</div>
<div class="card">
<div class="titulo">Compressor</div>
<div class="valor" id="compAtual" style="font-size:22px;">--</div>
</div>
<div class="card">
<div class="titulo">Agitador</div>
<div class="valor" id="agitAtual" style="font-size:22px;">--</div>
</div>
<div class="card">
<div class="titulo">Status</div>
<div class="valor" id="statusAtual" style="font-size:22px;">--</div>
</div>
<div class="card">
<div class="titulo">Última atualização</div>
<div class="valor" id="horaAtual" style="font-size:18px;">--</div>
</div>
</div>

<canvas id="graficoTemp"></canvas>

<table>
<thead>
<tr>
<th>Hora</th>
<th>Temp</th>
<th>Modo</th>
<th>Comp</th>
<th>Agit</th>
<th>Status</th>
</tr>
</thead>
<tbody id="tabelaBody"></tbody>
</table>
</main>

<script>
let chart;

function statusTexto(item) {
if (item.falha_resfriamento) return '<span class="alerta">FALHA</span>';
if (item.alarme_agitador) return '<span class="alerta">AGITADOR</span>';
if (item.resfriamento_lento) return '<span class="lento">LENTO</span>';
return '<span class="ok">OK</span>';
}

async function carregar() {
const res = await fetch('/api/v1/ultimos');
const dados = await res.json();

if (!Array.isArray(dados) || dados.length === 0) return;

const ultimo = dados[dados.length - 1];

document.getElementById('tempAtual').textContent = ultimo.temperatura.toFixed(2) + ' °C';
document.getElementById('modoAtual').textContent = ultimo.modo || '--';
document.getElementById('compAtual').textContent = ultimo.compressor ? 'ON' : 'OFF';
document.getElementById('agitAtual').textContent = ultimo.agitador ? 'ON' : 'OFF';
document.getElementById('statusAtual').innerHTML = statusTexto(ultimo);
document.getElementById('horaAtual').textContent = ultimo.datahora || new Date(ultimo.timestamp).toLocaleString('pt-BR');

const labels = dados.map(x => x.datahora || new Date(x.timestamp).toLocaleTimeString('pt-BR'));
const temps = dados.map(x => x.temperatura);

const ctx = document.getElementById('graficoTemp').getContext('2d');

if (chart) chart.destroy();

chart = new Chart(ctx, {
type: 'line',
data: {
labels,
datasets: [{
label: 'Temperatura (°C)',
data: temps,
tension: 0.2
}]
},
options: {
responsive: true,
maintainAspectRatio: true
}
});

const ultimos20 = dados.slice(-20).reverse();
const tbody = document.getElementById('tabelaBody');
tbody.innerHTML = '';

ultimos20.forEach(item => {
const tr = document.createElement('tr');
tr.innerHTML = \`
<td>\${item.datahora || new Date(item.timestamp).toLocaleString('pt-BR')}</td>
<td>\${Number(item.temperatura).toFixed(2)} °C</td>
<td>\${item.modo || '--'}</td>
<td>\${item.compressor ? 'ON' : 'OFF'}</td>
<td>\${item.agitador ? 'ON' : 'OFF'}</td>
<td>\${statusTexto(item)}</td>
\`;
tbody.appendChild(tr);
});
}

carregar();
setInterval(carregar, 15000);
</script>
</body>
</html>
`);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("Servidor rodando na porta " + PORT);
});
