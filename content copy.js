(() => {
    // "Aracı Değerlendir" butonunu sayfaya ekleyen fonksiyon
    function injectEvaluateButton() {
      // Buton zaten varsa eklemeyin
      if (document.getElementById('evaluateCarButton')) return;
  
      // Stil ekleme
      if (!document.getElementById('chatGPT-style')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'chatGPT-style';
        styleElement.textContent = `
          .chatGPT-btn {
            padding: 10px 20px;
            background-color: #1890ff;
            color: #fff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-bottom: 12px;
          }
        `;
        document.head.appendChild(styleElement);
      }
  
      // Butonu oluşturun
      if (!document.querySelector('.chatGPT-btn')) {
        const buttonHTML = `<div class="chatGPT-btn" id="evaluateCarButton">Aracı Değerlendir</div>`;
        const targetElement = document.querySelector('.classifiedUserBox') ||document.querySelector('.user-info-module');
        if (targetElement) {
          targetElement.insertAdjacentHTML('afterend', buttonHTML);
        }
      }
  
      // Tıklama olayını ekleyin
      document.querySelector('.chatGPT-btn')?.addEventListener('click', evaluateCar);
    }
  
    // Sayfadan araç bilgilerini toplayan fonksiyon
    function getCarData() {
      try {
        // Metni ayrıştırma fonksiyonu
        function parseClassifiedInfo(text) {
          const lines = text.split('\n');
          const data = {};
          let key = null;
  
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
  
            if (line && !key) {
              key = line;
            } else if (line && key) {
              data[key.replace(/\s+/g, '')] = line;
              key = null;
            }
          }
  
          return data;
        }
  
        // `detail` alanını ayrıştırma fonksiyonu
        function parseDetail(detailHTML) {
          // DOMParser kullanarak HTML metnini ayrıştırın
          const parser = new DOMParser();
          const doc = parser.parseFromString(detailHTML, 'text/html');
  
          const sections = {};
          const h3Elements = doc.querySelectorAll('h3');
  
          h3Elements.forEach(h3 => {
            const sectionTitle = h3.textContent.trim();
            let nextSibling = h3.nextElementSibling;
  
            // UL etiketi bulana kadar ilerleyin
            while (nextSibling && nextSibling.tagName !== 'UL') {
              nextSibling = nextSibling.nextElementSibling;
            }
  
            if (nextSibling && nextSibling.tagName === 'UL') {
              const items = [];
              const liElements = nextSibling.querySelectorAll('li');
  
              liElements.forEach(li => {
                const itemText = li.textContent.trim();
                const isSelected = li.classList.contains('selected');
  
                items.push({
                  name: itemText,
                  selected: isSelected,
                });
              });
  
              sections[sectionTitle] = items;
            }
          });
  
          return sections;
        }
  
        // `techDetails` alanını ayrıştırma fonksiyonu
        function parseTechDetails(techDetailsHTML) {
          // DOMParser kullanarak HTML metnini ayrıştırın
          const parser = new DOMParser();
          const doc = parser.parseFromString(techDetailsHTML, 'text/html');
  
          const techDetails = {};
          const h3Elements = doc.querySelectorAll('h3');
  
          h3Elements.forEach(h3 => {
            const sectionTitle = h3.textContent.trim();
            let nextSibling = h3.nextElementSibling;
  
            // TABLE etiketi bulana kadar ilerleyin
            while (nextSibling && nextSibling.tagName !== 'TABLE') {
              nextSibling = nextSibling.nextElementSibling;
            }
  
            if (nextSibling && nextSibling.tagName === 'TABLE') {
              const rows = nextSibling.querySelectorAll('tr');
              const specs = {};
  
              rows.forEach(row => {
                const titleCell = row.querySelector('td.title');
                const valueCell = row.querySelector('td.value');
  
                if (titleCell && valueCell) {
                  const key = titleCell.textContent.trim().replace(/\s+/g, ' ');
                  const value = valueCell.textContent.trim().replace(/\s+/g, ' ');
                  specs[key] = value;
                }
              });
  
              techDetails[sectionTitle] = specs;
            }
          });
  
          return techDetails;
        }
  
        // Ana veri işleme
        const classifiedInfoElement = document.querySelector('.classifiedInfoList');
        if (!classifiedInfoElement) {
          console.error('İlan bilgileri bulunamadı.');
          return null;
        }
  
        const carData = parseClassifiedInfo(classifiedInfoElement.innerText);
  
        // `detail` alanını ekleyin
        const detailElement = document.querySelector('.classifiedDescription');
        if (detailElement && detailElement.innerHTML) {
          const parsedDetail = parseDetail(detailElement.innerHTML);
          carData.detail = parsedDetail;
        }
  
        // `techDetails` alanını ekleyin
        const techDetailsElement = document.querySelector('.classifiedTechDetails');
        if (techDetailsElement && techDetailsElement.innerHTML) {
          const parsedTechDetails = parseTechDetails(techDetailsElement.innerHTML);
          carData.techDetails = parsedTechDetails;
        }
        if (document.querySelector('.classified-price-wrapper')) {
          carData.fiyat=document.querySelector('.classified-price-wrapper').innerText.trim();
        }
  
        console.log(carData);
  
        return carData;
      } catch (error) {
        console.error('getCarData hatası:', error);
        return null;
      }
    }
  
    // Araç verilerini backend'e gönderip değerlendirme isteyen fonksiyon
    async function evaluateCar() {
      const carData = getCarData();
      if (!carData) {
        alert('Araç bilgileri alınamadı.');
        return;
      }
  
      try {
        // Yükleme göstergesi ekleyin
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingIndicator';
        loadingDiv.innerText = 'Değerlendirme yapılıyor...';
        loadingDiv.style.position = 'fixed';
        loadingDiv.style.bottom = '60px';
        loadingDiv.style.right = '20px';
        loadingDiv.style.padding = '10px 20px';
        loadingDiv.style.zIndex = '10000';
        loadingDiv.style.backgroundColor = '#333';
        loadingDiv.style.color = '#fff';
        loadingDiv.style.borderRadius = '5px';
        document.body.appendChild(loadingDiv);
  
        const response = await fetch('http://localhost:5000/api/cars/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(carData),
        });
  
        const data = await response.json();
  
        // Yükleme göstergesini kaldırın
        loadingDiv.remove();
  
        if (response.ok) {
          // Değerlendirme sonucunu gösterin
          showEvaluationResult(data.evaluation);
        } else {
          alert('Değerlendirme yapılamadı: ' + data.message);
        }
      } catch (error) {
        console.error('evaluateCar hatası:', error);
        alert('Değerlendirme yapılamadı.');
      }
    }
  
    // Değerlendirme sonucunu ekranda gösteren fonksiyon
    function showEvaluationResult(evaluation) {
      // Zaten sonuç varsa güncelleyin
      if (document.getElementById('evaluationResult')) {
        document.getElementById('evaluationResult').innerText = evaluation;
        return;
      }
  
      const resultDiv = document.createElement('div');
      resultDiv.id = 'evaluationResult';
      resultDiv.innerText = evaluation;
      resultDiv.style.position = 'fixed';
      resultDiv.style.fontSize = '16px';
      resultDiv.style.bottom = '100px';
      resultDiv.style.right = '20px';
      resultDiv.style.padding = '10px 20px';
      resultDiv.style.zIndex = '10000';
      resultDiv.style.backgroundColor = '#fff';
      resultDiv.style.color = '#000';
      resultDiv.style.border = '1px solid #ccc';
      resultDiv.style.borderRadius = '5px';
      resultDiv.style.maxWidth = '300px';
      resultDiv.style.maxHeight = '400px';
      resultDiv.style.overflowY = 'auto';
  
      // Kapatma butonu ekleyin
      const closeButton = document.createElement('button');
      closeButton.innerText = 'Kapat';
      closeButton.style.marginTop = '10px';
      closeButton.style.padding = '5px 10px';
      closeButton.style.backgroundColor = '#1890ff';
      closeButton.style.color = '#fff';
      closeButton.style.border = 'none';
      closeButton.style.borderRadius = '5px';
      closeButton.style.cursor = 'pointer';
      closeButton.addEventListener('click', () => {
        resultDiv.remove();
      });
  
      resultDiv.appendChild(document.createElement('br'));
      resultDiv.appendChild(closeButton);
  
      document.body.appendChild(resultDiv);
    }
  
    // Sayfanın araç detay sayfası olup olmadığını kontrol eden fonksiyon
    function isCarDetailPage() {
      // URL veya sayfa yapısına göre ayarlayın
      return window.location.href.includes('/ilan/vasita') && (document.querySelector('.classifiedUserBox') ||document.querySelector('.user-info-module'));
    }
  
    // URL değişikliklerini izlemek için
    let lastCheckedUrl = location.href;
    setInterval(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastCheckedUrl) {
        lastCheckedUrl = currentUrl;
        if (isCarDetailPage()) {
          injectEvaluateButton();
        } else {
          // Başka sayfaya geçilirse butonu ve sonucu kaldırın
          const button = document.getElementById('evaluateCarButton');
          if (button) button.remove();
          const resultDiv = document.getElementById('evaluationResult');
          if (resultDiv) resultDiv.remove();
        }
      }
    }, 1000);
  
    // İlk kontrol
    if (isCarDetailPage()) {
      injectEvaluateButton();
    }
  })();
  

  (() => {
    // Türkçe ay isimlerini içeren bir dizi
    const months = {
      Ocak: '01', Şubat: '02', Mart: '03', Nisan: '04', Mayıs: '05', Haziran: '06',
      Temmuz: '07', Ağustos: '08', Eylül: '09', Ekim: '10', Kasım: '11', Aralık: '12'
    };
  
    let lastUrl = location.href;
    processPage();
  
    // URL değişikliklerini daha performanslı bir şekilde izlemek için setInterval kullanalım
    setInterval(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        processPage();
      }
    }, 1000); // Her saniyede bir kontrol ediyoruz
    function showNotification(message, isError = 0) {
      let color;
      switch (isError) {
        case 0:
          color = '#4CAF50'; // Başarılı işlem rengi (yeşil)
          break;
        case 1:
          color = '#f44336'; // Hata rengi (kırmızı)
          break;
        case 2:
          color = '#2196F3'; // Bilgi mesajı rengi (mavi)
          break;
        default:
          color = '#000000'; // Varsayılan renk (siyah)
          break;
      }
      const notification = document.createElement('div');
      notification.innerText = message;
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.right = '20px';
      notification.style.backgroundColor = color;
      notification.style.color = 'white';
      notification.style.padding = '15px';
      notification.style.zIndex = '9999';
      notification.style.borderRadius = '4px';
      notification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
    
  

  
    // Tooltip gösterme fonksiyonu
    function showTooltip(element, message) {
      const tooltip = document.createElement('div');
      tooltip.innerText = message;
      tooltip.style.position = 'absolute';
      tooltip.style.backgroundColor = '#333';
      tooltip.style.color = 'white';
      tooltip.style.padding = '5px 10px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.zIndex = '1000';
      tooltip.style.fontSize = '12px';
      tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      document.body.appendChild(tooltip);
  
      element.addEventListener('mousemove', (e) => {
        tooltip.style.left = e.pageX + 10 + 'px';
        tooltip.style.top = e.pageY + 10 + 'px';
      });
  
      element.addEventListener('mouseleave', () => {
        tooltip.remove();
      });
    }
  
    async function processPage() {
      try {
        const table = document.querySelector('#searchResultsTable');
        if (!table) {
          console.log('Bu sayfada tablo bulunamadı.');
          return;
        }
    
        const rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0) {
          console.log('Tabloda satır bulunamadı.');
          return;
        }
    
        const cars = [];
        const rowCarMap = new Map();
    
        for (const row of rows) {
          const car = extractCarData(row);
          if (car) {
            cars.push(car);
            rowCarMap.set(car.adId, row); // Satırları daha sonra kullanmak için eşleştiriyoruz
          }
        }
        showNotification('Kaydetmeye başladı', 2);
        // Tüm araçları tek seferde backend'e gönder
        const result = await saveCarData(cars);

    
    showNotification(result.message, 0);
        // Gelen yanıtı işleyerek fiyat geçmişlerini kullan
        if (result && result.data) {
          for (const item of result.data) {
            const carData = item.carData;
            const priceHistory = carData.priceHistory;
            const adId = carData.adId;
            const row = rowCarMap.get(adId);
    
            if (row && priceHistory && priceHistory.length > 0) {
              const firstPrice = priceHistory[0].price;
              const lastPrice = priceHistory[priceHistory.length - 1].price;
    
              if (firstPrice !== lastPrice) {

                const priceDifference = ((lastPrice - firstPrice) / firstPrice) * 100;
                const priceCell = row.querySelector('.searchResultsPriceValue');
    console.log(carData);
    
                const differenceElement = document.createElement('div');
                differenceElement.style.fontSize = '12px';
                differenceElement.style.fontWeight = 'bold';
                differenceElement.style.color = priceDifference < 0 ? 'green' : 'red';
                differenceElement.innerText = `${priceDifference.toFixed(2)}% ${priceDifference < 0 ? '↓' : '↑'}`;
                priceCell.appendChild(differenceElement);
    
                // Tooltip için fiyat geçmişini hazırla
                const tooltipData = priceHistory
                  .map(item => `${new Date(item.updatedAt).toLocaleDateString('tr-TR')}: ${item.price.toLocaleString()} TL`)
                  .join('\n');
    
                priceCell.addEventListener('mouseenter', () => {
                  showTooltip(priceCell, tooltipData);
                });
              }
            }
          }
        }
    
      } catch (error) {
        console.error('processPage hatası:', error);
        showNotification('Sayfa işlenirken bir hata oluştu.', 1);
      }
    }
    
    function extractCarData(row) {
      try {
        const adId = row.getAttribute('data-id');
        if (!adId) return null;
  
        const th = document.querySelector('#searchResultsTable thead tr');
        const index = {
          imageUrl: 0,
          brand: null,
          series: null,
          model: null,
          title: null,
          year: null,
          km: null,
          price: null,
          adDate: null,
          location: null,
        };
  
        th.querySelectorAll('td').forEach((el) => {
          if (el.innerText.trim() === "Marka") {
            index.brand = el.cellIndex;
          } else if (el.innerText.trim() === "Seri") {
            index.series = el.cellIndex;
          } else if (el.innerText.trim() === "Model") {
            index.model = el.cellIndex;
          } else if (el.innerText.trim() === "İlan Başlığı") {
            index.title = el.cellIndex;
          } else if (el.innerText.trim() === "Yıl") {
            index.year = el.cellIndex;
          } else if (el.innerText.trim() === "KM") {
            index.km = el.cellIndex;
          } else if (el.innerText.trim() === "Fiyat") {
            index.price = el.cellIndex;
          } else if (el.innerText.trim() === "İlan Tarihi") {
            index.adDate = el.cellIndex;
          } else if (el.innerText.trim() === "İlçe / Semt") {
            index.location = el.cellIndex;
          } else if (el.innerText.trim() === "İl / İlçe") {
            index.location = el.cellIndex;
          } else if (el.innerText.trim() === "Semt / Mahalle") {
            index.location = el.cellIndex;
          }
        });
  
        const dataCells = row.querySelectorAll('td');
        if (!index.brand) {
          document.querySelector('#search_cats ul .cl2')?.innerText.trim();
        }
  
        // Temel verileri çıkarma
        const car = {
          adId: parseInt(adId),
          imageUrl: dataCells[index.imageUrl]?.querySelector('img')?.src || '',
          brand: index.brand ? dataCells[index.brand]?.innerText.trim() : document.querySelector('#search_cats ul .cl2')?.innerText.trim() || '',
          series: index.series ? dataCells[index.series]?.innerText.trim() : document.querySelector('#search_cats ul .cl3')?.innerText.trim() || '',
          model: index.model ? dataCells[index.model]?.innerText.trim() : document.querySelector('#search_cats ul .cl4')?.innerText.trim() || '',
          title: row.querySelector('.classifiedTitle')?.innerText.trim() || '',
          year: parseInt(dataCells[index.year]?.innerText.trim()) || null,
          km: parseInt(dataCells[index.km]?.innerText.replace(/\D/g, '')) || null,
          price: parseInt(dataCells[index.price]?.innerText.replace(/\D/g, '')) || null,
          adDate: dataCells[index.adDate]?.innerText.trim().replace("\n", ' ') || '',
          adUrl: 'https://www.sahibinden.com' + row.querySelector('.classifiedTitle')?.getAttribute('href') || ''
        };
  
        // Lokasyon bilgisini çıkarma
        let city = '';
        let ilce = '';
        let semt = '';
        let mahalle = '';
  
        const locationHeaderTitle = document.querySelector('.searchResultsLocationHeader a')?.getAttribute('title');
        const locationCell = dataCells[index.location];
        const locationTexts = locationCell?.innerText.trim().split("\n") || [];
  
        if (locationHeaderTitle === "İl / İlçe") {
          city = locationTexts[0] || '';
          ilce = locationTexts[1] || '';
        } else if (locationHeaderTitle === "İlçe / Semt") {
          city = document.querySelector('[data-address="city"] a')?.innerText.trim() || '';
          ilce = locationTexts[0] || '';
          semt = locationTexts[1] || '';
        } else if (locationHeaderTitle === "Semt / Mahalle") {
          city = document.querySelector('[data-address="city"] a')?.innerText.trim() || '';
          ilce = document.querySelector('[data-address="town"] a')?.innerText.trim() || '';
          semt = locationTexts[0] || '';
          mahalle = locationTexts[1] || '';
        }
  
        // Lokasyon bilgilerini araca ekleme
        car.city = city;
        car.ilce = ilce;
        car.semt = semt;
        car.mahalle = mahalle;
  
        return car;
      } catch (error) {
        console.error('extractCarData hatası:', error);
        return null;
      }
    }
  
// API'ye araç verisini gönderme
async function saveCarData(cars) {
  try {
    const response = await fetch('https://sahibinden-backend-production.up.railway.app/api/cars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cars)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Veri gönderilirken bir hata oluştu.');
    }

    return data; // Yanıtı döndürün
  } catch (error) {
    console.error('saveCarData hatası:', error);
  }
}

  
    // API'den fiyat geçmişini alma
    async function fetchPriceHistory(adId) {
      try {
        const response = await fetch(`https://sahibinden-backend-production.up.railway.app/api/cars/${adId}/price-history`);
        const data = await response.json();
  
        if (response.ok) {
          return data.priceHistory || [];
        } else {
          throw new Error(data.message || 'Fiyat geçmişi alınırken bir hata oluştu.');
        }
      } catch (error) {
        console.error('fetchPriceHistory hatası:', error);
        return [];
      }
    }
  
  })();
  