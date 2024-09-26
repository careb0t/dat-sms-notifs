import "dotenv/config";
import axios from "axios";
import puppeteer from "puppeteer";
import fs from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let newProjects = [];
let oldProjects = [];
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("https://app.dataannotation.tech/users/sign_in");

    await page.type("#user_email", process.env.EMAIL);
    await page.type("#user_password", process.env.PASSWORD);
    await page.click(".btn");
    await page.waitForNavigation();

    const tables = await page.$$("table");
    const projTable = tables[1];
    const projRows = await projTable.$$("tbody tr");
    for (const row of projRows) {
        const cellData = await row.$$eval("td", (tds) => {
            return tds.map((td) => td.innerText);
        });
        const cellObj = cellData.reduce((acc, curr, index) => {
            switch (index) {
                case 0:
                    acc.name = curr;
                    break;
                case 1:
                    acc.rate = curr;
                    break;
                case 2:
                    acc.tasks = curr;
                    break;
                case 3:
                    acc.created = curr;
                    break;
            }
            return acc;
        }, {});
        newProjects.push(cellObj);
    }
    await browser.close();
    await loadFileData();
    await handleNewFile(newProjects);
    let matchFound = newProjectFound(newProjects, oldProjects);
    if (matchFound) {
        let message = createMessage(newProjects);
        sendText(message);
    }
})();

const loadFileData = async () => {
    const data = await readFile("projects.json");
    if (data.length == 0) {
        oldProjects = [];
    } else {
        const jsonData = JSON.parse(data);
        oldProjects = jsonData;
    }
}

const handleNewFile = function(projects) {
    const filePath = path.join(__dirname, "projects.json");

    // File exists, overwrite it
    fs.writeFile(filePath, JSON.stringify(projects, null, 2), (err) => {
        if (err) {
            console.error(err);
        }
    });
};

const newProjectFound = function(newProjects, prevProjects) {
    const newNames = newProjects.map((p) => p.name);
    const oldNames = prevProjects.map((p) => p.name);

    newNames.forEach((name) => {
        if (oldNames.includes(name)) {
            return false;
        }
    });
    return true;
};

const createMessage = function(projects) {
    let message = "";

    projects.forEach((project) => {
        for (const key in project) {
            message += `${key}: ${project[key]}\n`;
            if (key === "created") message += '\n'
        }
    });
    console.log(message);
    return message;
};

const sendText = function(message) {
    const apiKey = process.env.APIKEY;

    axios
        .post("https://textbelt.com/text", {
            phone: "2146862461",
            message: message,
            key: apiKey,
        })
        .then((response) => {
            console.log(response.data);
        });
};
