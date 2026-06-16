const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log("Navigating to http://localhost:3000/training...");
    await page.goto('http://localhost:3000/training');
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    const link = await page.$('a[href*="/training/"]');
    if (link) {
      await link.click();
      await page.waitForTimeout(2000);
      
      const sublink = await page.$('a[href*="/training/"]');
      if (sublink) {
        await sublink.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/Users/kaimathema/.gemini/antigravity/brain/d0a0a5fa-74bd-495c-be93-31dd84f95783/public_training_folders.png', fullPage: true });
        console.log("Took public folders screenshot");
      }
    }
  } catch (err) {
    console.error("Error during screenshot:", err);
  } finally {
    await browser.close();
  }
})();
