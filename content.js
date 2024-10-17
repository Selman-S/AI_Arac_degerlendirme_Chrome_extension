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
  
        const response = await fetch('https://sahibinden-backend-production.up.railway.app/api/cars/evaluate', {
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
  