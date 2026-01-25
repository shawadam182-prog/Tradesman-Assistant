import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

async function capture() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: true, // Use headless for now, can perform interactions
        defaultViewport: { width: 1920, height: 1080 }
    });
    const page = await browser.newPage();

    console.log('Navigating to TradeSync...');
    await page.goto('https://tradesync.info', { waitUntil: 'networkidle2', timeout: 60000 });

    // Login Flow
    console.log('Attempting login...');
    // Click "Login" button on landing page if it exists, or directly input if on login page
    // The landing page usually has a Login button. Let's look for a button with text "Sign In" or "Login"
    // Based on LandingPage.tsx (implied structure), there's likely a login button.
    // However, simpler to go directly to /login handled by ViewRouter if we can, but it's client-side routing.
    // Let's assume we land on LandingPage and click a login button.

    // Wait for any button that might be "Sign In"
    // Puppeteer supports xpath selectors with `xpath/` prefix in standard selectors or using `$$`
    const loginButton = await page.$$("xpath/.//button[contains(., 'Sign In')]");
    if (loginButton.length > 0) {
        await loginButton[0].click();
    }

    // Wait for email input
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'demo@tradesync.info'); // Use valid demo credentials if known, or these as placeholder
    await page.type('input[type="password"]', 'demo1234'); // Placeholder password

    // Submit login
    const submitButton = await page.waitForSelector('button[type="submit"]');
    await submitButton?.click();

    // Wait for MainApp to load (check for "Add Customer" button or similar dashboard element)
    console.log('Waiting for dashboard...');
    try {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    } catch (e) {
        console.log('Navigation timeout or already loaded');
    }

    // Take screenshot of Dashboard
    const dashboardPath = path.join(__dirname, '../public/dashboard.png');
    await page.screenshot({ path: dashboardPath, fullPage: true });
    console.log('Dashboard captured');

    // Navigate to Customers tab
    console.log('Navigating to Customers...');
    // Find button with text "Customers" or icon
    // In MainApp.tsx, activeTab is managed by state. We need to click the navigation item.
    // Assuming a navigation bar exists (Layout component).
    // Let's click on a text "Customers" if available in the layout sidebar/bottom bar.
    const customersLink = await page.$$("xpath/.//span[contains(., 'Customers')]");
    if (customersLink.length > 0) {
        await customersLink[0].click();
        await new Promise(r => setTimeout(r, 2000)); // Wait for transition
    }

    // Take screenshot of Customers List
    const customersPath = path.join(__dirname, '../public/customers.png');
    await page.screenshot({ path: customersPath, fullPage: true });
    console.log('Customers list captured');

    await browser.close();
    console.log('Done!');
}

capture().catch(console.error);
