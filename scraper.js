const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Set user agent ke browser desktop default
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
  );

  // Buka halaman OfferUp
  await page.goto('https://offerup.com/explore/k/5');
  console.log('open offerup');

  await page.waitForSelector('div > ul');

  // Ambil link dari setiap item di halaman utama
  const links = await page.evaluate(() => {
    const links = [];
    const ul = document.querySelectorAll('ul li a');
    if (ul) {
      ul.forEach((a) => {
        links.push(a.href);
      });
    }
    return links;
  });

  const filePath = path.join(__dirname, 'vehicles_data.json');

  const file = fs.readFileSync(filePath, 'utf8');

  const jsonArray = JSON.parse(file);

  for (const link of links) {
    // Buka halaman detail untuk setiap item
    const detailPage = await browser.newPage();
    await detailPage.goto(link);

    // Tunggu elemen yang relevan dimuat di halaman detail
    await detailPage.waitForSelector('h1.MuiTypography-root');

    // Ambil data dari halaman detail
    const data = await detailPage.evaluate(() => {
      const title = document.querySelector('h1.MuiTypography-root')?.innerText;
      const priceElement = Array.from(
        document.querySelectorAll('p.MuiTypography-root')
      ).find((p) => p.innerText.startsWith('$'));
      const price = priceElement ? priceElement.innerText : 'Price not found';
      let phoneNumber = '';

      const phoneNumberElement = document.querySelector(
        'li:has(svg[aria-label="Phone number"]) .MuiTypography-subtitle2'
      );

      phoneNumber = phoneNumberElement
        ? phoneNumberElement.innerText.trim()
        : 'Phone number not found';

      const web = window.location.href;

      let categories = '';
      const paragraphElement = Array.from(document.querySelectorAll('p')).find(
        (p) =>
          p.querySelector('span')?.innerText.trim() === 'Listed in categories:'
      );

      if (paragraphElement) {
        // Mengambil teks di luar <span>
        const spanElement = paragraphElement.querySelector('span');
        const textAfterSpan = spanElement
          ? spanElement.nextSibling.nodeValue.trim()
          : '';
        categories = textAfterSpan;
      }

      return { title, price, web, phoneNumber, categories };
    });

    jsonArray.push(data);
    console.log(data);

    // Menulis ulang file JSON dengan data yang dimodifikasi
    fs.writeFileSync(filePath, JSON.stringify(jsonArray, null, 2), 'utf8');

    // Tutup halaman detail dan kembali ke halaman utama
    await detailPage.close();
  }

  console.log('Data telah disimpan ke vehicles_data.txt');

  await browser.close();
})();
