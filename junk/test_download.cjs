const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const downloadPath = path.resolve(__dirname, 'downloads');

if (!fs.existsSync(downloadPath)){
    fs.mkdirSync(downloadPath);
}

// Clear old downloads
const files = fs.readdirSync(downloadPath);
for (const file of files) {
  fs.unlinkSync(path.join(downloadPath, file));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });

  try {
    console.log("Navigating to http://localhost:5173 ...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    console.log("Opening dropdown...");
    await page.evaluate(() => {
      // Find the dropdown which has "Choose a section..." text
      const spans = Array.from(document.querySelectorAll('span'));
      const span = spans.find(s => s.innerText.includes('Choose a section'));
      if (span && span.parentElement) {
        span.parentElement.click();
      }
    });

    console.log("Typing filter...");
    await page.waitForSelector('input[placeholder="Filter sections..."]', { timeout: 5000 });
    await page.type('input[placeholder="Filter sections..."]', '2A');
    
    console.log("Clicking section...");
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const section = divs.find(d => d.innerText === 'Section 2A' && d.className.includes('cursor-pointer'));
      if (section) section.click();
    });

    console.log("Clicking Generate Routine...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Generate Routine'));
      if (btn) btn.click();
    });

    console.log("Waiting for results...");
    await page.waitForSelector('#routine-print-sheet', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    console.log("Testing Image Download...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Image'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 6000));

    console.log("Testing PDF Download...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('PDF'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    console.log("Checking downloads directory...");
    const downloadedFiles = fs.readdirSync(downloadPath);
    console.log("Downloaded files:", downloadedFiles);

    let hasPdf = false;
    let hasPng = false;
    for (const f of downloadedFiles) {
      if (f.endsWith('.pdf')) hasPdf = true;
      if (f.endsWith('.png')) hasPng = true;
    }

    if (hasPdf && hasPng) {
        console.log("SUCCESS: Both PDF and PNG files were correctly downloaded with extensions!");
    } else {
        console.error("FAILED: Missing PDF or PNG extension. Files found:", downloadedFiles);
        process.exit(1);
    }

  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
