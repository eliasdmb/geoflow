import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Listen for console events
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER CONSOLE ERROR:', msg.text());
        }
    });

    page.on('pageerror', err => {
        console.log('BROWSER PAGE ERROR:', err.toString());
    });

    try {
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
        console.log('Page loaded.');

        // Attempt to click the first project in the list
        // Look for text or link that indicates a project.
        // E.g., a div that contains a click handler. The Dashboard has project cards.
        // The previous implementation used "Visualizar Projeto" or similar.

        await page.waitForTimeout(2000); // give app time to render

        // We can evaluate code on the page to find projects and click one
        await page.evaluate(() => {
            // Find something that looks like a project link or button
            const buttons = Array.from(document.querySelectorAll('button, a'));
            const projectBtn = buttons.find(b => b.innerText && (b.innerText.includes('Visualizar') || b.innerText.includes('Projeto') || b.innerText.includes('Ver mais')));
            if (projectBtn) {
                projectBtn.click();
            } else {
                // Just click on the first thing that looks like a card
                const cards = Array.from(document.querySelectorAll('.glass-card'));
                if (cards.length > 0) cards[2].click(); // Guess
            }
        });

        await page.waitForTimeout(3000); // wait for transition
        console.log('Done testing.');
    } catch (error) {
        console.error('PUPPETEER EXCEPTION:', error);
    } finally {
        await browser.close();
    }
})();
