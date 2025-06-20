// @ts-nocheck
/**
 * Projeto em:
 * https://github.com/marcoantonioq/siga
 */
const API_URL = 'https://node.goias.ifg.edu.br/api/siga';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('✍️ CCB')
    .addItem('📊 SIGA', 'showPage')
    .addToUi();
}

function baixarSiga(payload = { username: '.' }) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    timeout: 600000,
  };

  const msg = { success: false, errors: [] };

  try {
    const response = UrlFetchApp.fetch(API_URL, options);

    if (response.getResponseCode() !== 200) {
      throw new Error(`Erro HTTP: ${response.getResponseCode()}`);
    }

    const parsedResponse = JSON.parse(response.getContentText());

    if (parsedResponse.success && parsedResponse?.tables?.igrejas?.length) {
      criarTabelasNoGoogleSheets(parsedResponse);
    } else {
      console.log('Dados retornados:::: ', parsedResponse);
      if (parsedResponse?.errors?.length) {
        msg.errors.push(...parsedResponse.errors);
      } else {
        msg.errors.push('Dados inválidos ou sem igrejas na resposta.');
      }
    }
    return { ...msg, ...parsedResponse };
  } catch (error) {
    handleFetchError(error, msg);
    return msg;
  }
}

function handleFetchError(error, msg) {
  const message = `Não foi possível conectar ao servidor. Tentando reconectar... \n</br><small>${
    error.message || error
  }</small>`;
  console.log('msg::: ', msg);
  msg.errors.push(message);
  console.error(message);
}

function GoogleSheets(msg) {
  if (msg?.tables) {
    msg.tables = JSON.parse(msg.tables)
    criarTabelasNoGoogleSheets(msg);
  } else {
    console.error('Nenhuma tabela encontrada no objeto msg:', msg);
  }
}

function criarTabelasNoGoogleSheets(msg) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  console.log("Atualizando planilha: ", msg)

  for (const tableName in msg?.tables || []) {
    console.log("Dados da tabela:", tableName, msg.tables[tableName].length);
    
    const data = msg.tables[tableName];
    const sheet = ss.getSheetByName(tableName) || ss.insertSheet(tableName);

    if (data.length > 0) {
      sheet.clear();
      const headers = Object.keys(data[0]);
      const rows = data.map((row) =>
        headers.map((header) =>
          ['DATA', 'UPDATED', 'CREATED'].includes(header) && row[header]
            ? new Date(row[header])
            : row[header]
        )
      );
      rows.unshift(headers);
      sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);

      headers.forEach((header, i) => {
        if (['DATA', 'UPDATED', 'CREATED'].includes(header)) {
          sheet
            .getRange(1, i + 1, rows.length - 1)
            .setNumberFormat('dd/MM/yyyy HH:mm');
        }
      });
    }
  }
}

function showPage() {
  const html = HtmlService.createHtmlOutputFromFile('page')
    .setWidth(450)
    .setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, 'Carregar Dados');
}