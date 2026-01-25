import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

async function capture() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    console.log('Navigating to TradeSync...');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('https://tradesync.info', { waitUntil: 'networkidle2', timeout: 60000 });

    const outputPath = path.join(__dirname, '../public/homepage.png');
    console.log('Taking screenshot to', outputPath);

    await page.screenshot({ path: outputPath, fullPage: true });

    await browser.close();
    console.log('Done!');
}

capture().catch(console.error);
