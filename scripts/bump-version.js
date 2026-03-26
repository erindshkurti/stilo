const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../build-number.json');

try {
    let data = { buildNumber: 0 };
    if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    data.buildNumber += 1;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`\n✅ Build number successfully bumped to: ${data.buildNumber}\n`);
} catch (error) {
    console.error("Failed to bump build number:", error);
    process.exit(1);
}
