const mammoth = require("mammoth");

async function parseDocx(filePath) {
    console.log(`\n--- Docx: ${filePath} ---`);
    try {
        const result = await mammoth.extractRawText({path: filePath});
        console.log(result.value);
    } catch (err) {
        console.error(err);
    }
}

parseDocx('e:\\Coding\\Guru-Cerdas\\data\\ABSENSI 2C 2026-2027.docx');
