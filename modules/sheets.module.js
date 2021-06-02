
// https://medium.com/seventyseven/using-google-apis-in-an-app-engine-application-with-node-js-8cd4746b2e2d
const fs = require("fs");
const google = require("googleapis").google;

module.exports = {
  auth: async function() {
    // Load the key
    const key = JSON.parse(fs.readFileSync("./keys/key.json").toString());
    // Auth using the key
    const auth = await google.auth.fromJSON(key);
    // Add read / write spreadsheets scope to our auth client
    auth.scopes = ["https://www.googleapis.com/auth/spreadsheets"];
    // Create an instance of sheets to a scoped variable
    this.sheets = await google.sheets({ version: "v4", auth });
    console.log("Authed with google and instantiated google sheets");
  },
  writeToSheet: async function(spreadsheetId, sheetName, values, index) {
      console.log("Starting to write");
    // Create the resource for google sheets
    const resource = {
      values
    };
    // Write out to the spreadsheet
    const res = await this.sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A${index + 2}:D${values.length + 1 + index}`,
      valueInputOption: "RAW",
      resource: resource
    });
    console.log("Updated spreadsheet!");
  },
  getSheetPromise: async function(){
      return this.sheets;
  }
};