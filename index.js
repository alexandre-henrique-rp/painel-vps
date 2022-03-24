require('dotenv').config();
const express = require('express'); //chamando a biblioteca express //
const cors = require('cors');
const mysql = require('mysql'); //chamando a biblioteca mysql
const nodemailer = require('nodemailer');
const axios = require('axios');
const bodyParser = require('body-parser');


const conn = mysql.createConnection({   //solicitação de conexão
  host: process.env.BD_HOST,
  user: process.env.BD_USER,
  password: process.env.BD_PASSWORD,
  database: process.env.BD_DATABASE
});

conn.connect(); //ligar a conexão com mysql

const app = express();

app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// mensagem

app.post('/send/email', function (req, res) {

  let email = req.body.email;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secureConnection: false,
    requireTLS: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
    },
  })
  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    // to: "alexandreredebrasil@gmail.com",
    subject: '"Urgente" O seu certificado corre o risco de nao funcionar mais',
    // text: "Prezado Cliente \n \nEstamos entrando em contato para informar que o seu Certificado digital \nModelo: <strong>" + req.body.tipoCD + ". - " + req.body.titulo + ",</strong>\n<strong>" + req.body.titulo_doc + "</strong> \nExpira " + req.body.dia + "          " + req.body.vctoCD.substr(8, 2) + "/" + req.body.vctoCD.substr(5, 2) + "/" + req.body.vctoCD.substr(0, 4) + "            \nfc:" + req.body.id + "       \n \nNão deixe para a última hora, ligue agora          \npara (16) 3325-4134 e renove o seu certificado.          \nAtenciosamente Equipe Rede Brasil Rp",
    html: '<b>Prezado Cliente</b><br><br><br><p>Estamos entrando em contato para informar que o seu Certificado digital<br>Modelo: <strong>' + req.body.tipoCD + '</strong>. - <strong>' + req.body.titulo + '</strong>,<br><strong>' + req.body.titulo_doc + '</strong>,  Expira:  <strong>' + req.body.dia + '</strong>     ' + req.body.vctoCD.substr(8, 2) + '/' + req.body.vctoCD.substr(5, 2) + '/' + req.body.vctoCD.substr(0, 4) + '<br>fc:' + req.body.id + '<br><br><br><br>Não deixe para a última hora, Entre em contato agora pelo WhatsApp <br>para <a href="https://api.whatsapp.com/send?phone=551633254134&text=Ola%20quero%20renovar%20meu%20Certificado">(16) 3325-4134</a> e renove o seu certificado.<br><br><br><br><br>Atenciosamente Equipe Rede Brasil Rp</p>'
  })
    .then(info => {
      return res.status(200).send({ info, message: "Messagem enviada comsucesso" })
      
    }).catch(error => {
      return res.status(400).json({
        error: true,
        message: 'Erro: Não foi possível enviar mesagem!'
      });
    })
});


// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// WhatsApp

app.post('/send/whatsapp', async function (req, res, next) {
  dados = req.body;
  // dados = JSON.stringify({ front });

  console.log(dados)

  var smsScript = `Prezado Cliente \n \nEstamos entrando em contato para informar que o seu Certificado digital \nModelo: *${req.body.tipoCD}. - ${req.body.titulo},*\n*${req.body.titulo_doc}* \nExpira ${req.body.dia}          ${req.body.vctoDia}/${req.body.vctoMes}/${req.body.vctoAno}            \nfc:${req.body.id}       \n \nNão deixe para a última hora, Entre em contato agora          \npelo WhatsApp (16) 3325-4134 e renove o seu certificado.          \nAtenciosamente Equipe Rede Brasil Rp`
  const requestOptionsDefault = {
    headers: {
      "access-token": "60de0c8bb0012f1e6ac5546b",
      "Content-Type": "application/json"
    },
    redirect: 'follow'
  };
  axios.post("https://api.zapstar.com.br/core/v2/api/chats/send-text", JSON.stringify({
    "number": 55 + req.body.telefone,
    "message": smsScript,
    "forceSend": true,
    "verifyContact": false
  }), requestOptionsDefault)
    .then(() => {
      return res.status(200).send({ status: 0, message: "Messagem enviada comsucesso" })
    })
    .catch(err => {
      return res.status(400).json({
        error: true,
        message: 'Erro: Não foi possível enviar mesagem!'
      });
    });
  


});

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Listar

app.get('/cliente', function (req, res) {

  conn.query('SELECT id, vctoCD, s_alerta, tipoCD, telefone, email, IF(tipocd LIKE "%J%", razaosocial, nome) AS titulo, CASE WHEN tipocd LIKE "%J%" THEN cnpj WHEN tipocd LIKE "%F%" THEN cpf END as titulo_doc FROM fcweb WHERE  s_alerta = "ATIVADO" AND vctoCD BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY) ORDER BY id DESC', function (erro, resultado, campos) {
    res.json(resultado);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// pesquisa

app.get('/cliente/:pesquisa', function (req, res) {

  var whereTitulo = '';

  if (req.params.titulo != '-') {
    whereTitulo = ' WHERE nome like "%' + req.params.titulo + '%" OR cpf like "%' + req.params.titulo + '%" OR cnpj like "%' + req.params.titulo + '%" OR contador like "%' + req.params.titulo + '%" OR razaosocial like "%' + req.params.titulo + '%" OR solicitacao like "%' + req.params.titulo + '%"'
  };

  conn.query('SELECT * FROM `fcweb`' + whereTitulo, function (erro, resultado, campos) {
    res.json(resultado);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get 30 dias antes do vencimento

app.get('/cliente-30', function (req, res) {
  conn.query('SELECT id, vctoCD, s_alerta, tipoCD, telefone, email, IF(tipocd LIKE "%J%", razaosocial, nome) AS titulo, CASE WHEN tipocd LIKE "%J%" THEN cnpj WHEN tipocd LIKE "%F%" THEN cpf END as titulo_doc FROM fcweb WHERE  s_alerta = "ATIVADO" AND `vctoCD` = DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY)', function (erro, resultado, campos) {
    res.json(resultado);
  });
});


// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get 15 dias antes do vencimento

app.get('/cliente-15', function (req, res) {
  conn.query('SELECT id, vctoCD, s_alerta, tipoCD, telefone, email, IF(tipocd LIKE "%J%", razaosocial, nome) AS titulo, CASE WHEN tipocd LIKE "%J%" THEN cnpj WHEN tipocd LIKE "%F%" THEN cpf END as titulo_doc FROM fcweb WHERE  s_alerta = "ATIVADO" AND `vctoCD` = DATE_ADD(CURRENT_DATE(), INTERVAL 15 DAY)', function (erro, resultado, campos) {
    res.json(resultado);
  });
});


// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get 10 dias antes do vencimento

app.get('/cliente-10', function (req, res) {
  conn.query('SELECT id, vctoCD, s_alerta, tipoCD, telefone, email, IF(tipocd LIKE "%J%", razaosocial, nome) AS titulo, CASE WHEN tipocd LIKE "%J%" THEN cnpj WHEN tipocd LIKE "%F%" THEN cpf END as titulo_doc FROM fcweb WHERE  s_alerta = "ATIVADO" AND `vctoCD` = DATE_ADD(CURRENT_DATE(), INTERVAL 10 DAY)', function (erro, resultado, campos) {
    res.json(resultado);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get 5 dias antes do vencimento

app.get('/cliente-5', function (req, res) {
  conn.query('SELECT id, vctoCD, s_alerta, tipoCD, telefone, email, IF(tipocd LIKE "%J%", razaosocial, nome) AS titulo, CASE WHEN tipocd LIKE "%J%" THEN cnpj WHEN tipocd LIKE "%F%" THEN cpf END as titulo_doc FROM fcweb WHERE  s_alerta = "ATIVADO" AND `vctoCD` = DATE_ADD(CURRENT_DATE(), INTERVAL 5 DAY)', function (erro, resultado, campos) {
    res.json(resultado);
  });
});


// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get 1 dias antes do vencimento

app.get('/cliente-1', function (req, res) {
  conn.query('SELECT id, vctoCD, s_alerta, tipoCD, telefone, email, IF(tipocd LIKE "%J%", razaosocial, nome) AS titulo, CASE WHEN tipocd LIKE "%J%" THEN cnpj WHEN tipocd LIKE "%F%" THEN cpf END as titulo_doc FROM fcweb WHERE  s_alerta = "ATIVADO" AND `vctoCD` = DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)', function (erro, resultado, campos) {
    res.json(resultado);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get com o vencimento para hoje

app.get('/cliente-now', function (req, res) {
  conn.query('SELECT id, vctoCD, s_alerta, tipoCD, telefone, email, IF(tipocd LIKE "%J%", razaosocial, nome) AS titulo, CASE WHEN tipocd LIKE "%J%" THEN cnpj WHEN tipocd LIKE "%F%" THEN cpf END as titulo_doc FROM fcweb WHERE  s_alerta = "ATIVADO" AND `vctoCD`= CURRENT_DATE()', function (erro, resultado, campos) {
    res.json(resultado);
  });
});


// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Get agenda

app.get('/agendados', function (req, res) {
  conn.query('SELECT id, dt_agenda, hr_agenda, obs_agenda, andamento, validacao, vctoCD, tipoCD, telefone, email, IF(tipocd LIKE "%J%", razaosocial, nome) AS titulo, CASE WHEN tipocd LIKE "%J%" THEN cnpj WHEN tipocd LIKE "%F%" THEN cpf END as titulo_doc FROM fcweb WHERE dt_agenda <> "0000-00-00" and hr_agenda <> "00:00:00" ORDER BY hr_agenda asc', function (erro, resultado, campos) {
    res.json(resultado);
  });
});


// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Log Erro

app.post('/log-error', function (req, res) {
  conn.query('INSERT INTO log_error (log, ref) VALUES ("' + req.body.log + '", "' + req.body.ref + '")', function (erro, resultado, campos) {
    res.json(resultado);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


// Delete

app.delete('/usuario/apagar/:id', function (req, res) {

  conn.query('DELETE FROM usuarios WHERE id = ' + req.params.id, function (erro, resultado, campos) {
    res.json(resultado);
  });
});

app.delete('/cliente/apagar/:id', function (req, res) {

  conn.query('DELETE FROM clientes WHERE id = ' + req.params.id, function (erro, resultado, campos) {
    res.json(resultado);
  });
});



app.listen(process.env.SERVE_PORT || 3035, function () {
  console.log('servidor em execução')
});