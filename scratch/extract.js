
const fs = require("fs");
const path = require("path");

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

let output = "";
walkSync("./bastura-api/src/auth/global", function(filePath, stat) {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    output += `\n--- FILE: ${filePath} ---\n`;
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (l.startsWith("export const ") || l.includes("req.param(") || l.includes("req.json(") || l.includes("send") || l.includes("return c.json") || l.includes("c.req.query")) {
            output += `${i+1}: ${l}\n`;
        }
    }
});

fs.writeFileSync("./scratch/summary_auth.txt", output);

