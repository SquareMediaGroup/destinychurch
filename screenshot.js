const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log("Navigating to http://localhost:3000/administration/training...");
    await page.goto('http://localhost:3000/administration/training');
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Take screenshot of the training overview
    await page.screenshot({ path: '/Users/kaimathema/.gemini/antigravity/brain/d0a0a5fa-74bd-495c-be93-31dd84f95783/training_overview.png' });
    console.log("Took overview screenshot");

    // Attempt to navigate to the first subgroup
    const link = await page.$('a[href*="/administration/training/"]');
    if (link) {
      await link.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/Users/kaimathema/.gemini/antigravity/brain/d0a0a5fa-74bd-495c-be93-31dd84f95783/training_category.png', fullPage: true });
      console.log("Took category screenshot");
      
      const sublink = await page.$('a[href*="/administration/training/"]');
      if (sublink) {
        await sublink.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/Users/kaimathema/.gemini/antigravity/brain/d0a0a5fa-74bd-495c-be93-31dd84f95783/training_subgroup_folders.png', fullPage: true });
        console.log("Took subgroup folders screenshot");
      }
    }
  } catch (err) {
    console.error("Error during screenshot:", err);
  } finally {
    await browser.close();
  }
})();
