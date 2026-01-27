import puppeteer from 'puppeteer';
import path from 'path';

async function capture() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 }
    });
    const page = await browser.newPage();

    // Helper to take screenshots
    const takeScreenshot = async (name: string) => {
        const filePath = path.join(__dirname, `../public/${name}`);
        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`Captured: ${name}`);
    };

    try {
        console.log('Navigating to TradeSync...');
        await page.goto('https://tradesync.info', { waitUntil: 'networkidle2', timeout: 60000 });

        // 1. Login Flow
        console.log('Checking for login...');

        // Check if we are already logged in (look for a dashboard element) or need to login
        // Try to find the specific login button or inputs
        const signinButton = await page.$("xpath/.//button[contains(., 'Sign In')]");
        const loginLink = await page.$("a[href='/login']");

        if (signinButton) {
            console.log('Clicking Sign In button...');
            await signinButton.click();
            try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { console.log('Sign In Nav wait skipped'); }
        } else if (loginLink) {
            console.log('Clicking Login link...');
            await loginLink.click();
            try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { console.log('Login Link Nav wait skipped'); }
        }

        // Wait for email input to be sure we are on login page
        try {
            await page.waitForSelector('input[type="email"]', { timeout: 5000 });
            console.log('Filling credentials...');
            await page.type('input[type="email"]', 'demo@tradesync.info');
            await page.type('input[type="password"]', 'demo1234');

            const submitButton = await page.$('button[type="submit"]');
            if (submitButton) {
                await submitButton.click();
                try { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { console.log('Submit Nav wait skipped'); }
            }
        } catch (e) {
            console.log('Login inputs not found, possibly already logged in or on dashboard.');
        }

        // 2. Dashboard
        console.log('Waiting for Dashboard...');
        // Wait for a common element like "Total Revenue" or a sidebar item
        await page.waitForSelector('main', { timeout: 15000 });
        // Give it a moment for charts to animate
        await new Promise(r => setTimeout(r, 2000));
        await takeScreenshot('dashboard.png');

        // 3. Customers List
        console.log('Navigating to Customers...');
        const customerLinks = await page.$$("xpath/.//a[contains(., 'Customers')] | .//button[contains(., 'Customers')] | .//span[contains(., 'Customers')]");

        let navClicked = false;
        if (customerLinks.length > 0) {
            for (const link of customerLinks) {
                if (await link.boundingBox()) {
                    await link.click();
                    navClicked = true;
                    break;
                }
            }
        }

        if (!navClicked) {
            await page.goto('https://tradesync.info/customers', { waitUntil: 'domcontentloaded' });
        }

        try {
            // Wait for unique element on customer page (e.g. New Contact button)
            await page.waitForFunction(() => {
                return document.body.innerText.includes('New Contact') || document.body.innerText.includes('Add');
            }, { timeout: 10000 });
        } catch (e) { console.log('Wait for customers page content failed'); }

        await new Promise(r => setTimeout(r, 1000));
        await takeScreenshot('customers_list.png');

        // 4. Add Customer Modal
        console.log('Opening Add Customer modal...');
        const addCustomerBtns = await page.$$("xpath/.//button[contains(., 'Add Customer')] | .//button[contains(., 'New Contact')] | .//button[contains(., 'Add')]");

        let worked = false;
        if (addCustomerBtns.length > 0) {
            for (const btn of addCustomerBtns) {
                if (await btn.boundingBox()) {
                    await btn.hover();
                    await btn.click();
                    worked = true;
                    break;
                }
            }
        }

        if (worked) {
            await new Promise(r => setTimeout(r, 1000)); // Animation
            await takeScreenshot('add_customer_empty.png');

            // Type into form
            console.log('Filling Customer Form...');
            // Attempt to find inputs by name or simple selector
            const nameInput = await page.$('input[name="name"]') || await page.$('input[autocomplete="name"]');
            if (nameInput) await nameInput.type('John Doe');

            const emailInput = await page.$('input[name="email"]') || await page.$('input[autocomplete="email"]');
            if (emailInput) await emailInput.type('john.doe@example.com');

            const companyInput = await page.$('input[name="company"]') || await page.$('input[autocomplete="organization"]');
            if (companyInput) await companyInput.type('Doe Constructions');

            await new Promise(r => setTimeout(r, 500));
            await takeScreenshot('add_customer_filled.png');

            // Escape/Close modal
            await page.keyboard.press('Escape');
            await new Promise(r => setTimeout(r, 1000));
        } else {
            console.log('Could not find Add Customer button');
        }

        // 5. Quotes
        console.log('Navigating to Quotes...');
        await page.goto('https://tradesync.info/quotes', { waitUntil: 'domcontentloaded' });

        try {
            // Wait for unique element on quotes page
            await page.waitForFunction(() => {
                return document.body.innerText.includes('New Quote') || document.body.innerText.includes('Create Quote');
            }, { timeout: 10000 });
        } catch (e) { console.log('Wait for quotes page content failed'); }

        await takeScreenshot('quotes_list.png');

    } catch (error) {
        console.error('Capture failed:', error);
    } finally {
        await browser.close();
        console.log('Done!');
    }
}

capture();
