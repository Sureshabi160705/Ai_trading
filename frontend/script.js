// --- Utilities ---
lucide.createIcons();

// --- Theme Management ---
const themeToggle = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

themeToggle.addEventListener('click', () => {
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', newTheme);
    updateChartTheme();
});

// --- Settings ---
const UPDATE_INTERVAL = 2000; // 2 seconds
const HISTORY_LEN = 20;

const formatCurrency = (val) => {
    return val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Local state for charting history
const indexHistory = {
    'NIFTY': Array(HISTORY_LEN).fill(null),
    'SENSEX': Array(HISTORY_LEN).fill(null)
};
const optionChartsConfigMap = {};

// --- Chart Initialization ---
Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
Chart.defaults.font.family = "'Inter', sans-serif";

function createSpotChart(ctxId, label) {
    const ctx = document.getElementById(ctxId).getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(HISTORY_LEN).fill(''),
            datasets: [{
                label: label,
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500,
                easing: 'linear'
            },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { 
                    display: true, 
                    position: 'right',
                    grid: { color: 'rgba(150, 150, 150, 0.1)' }
                }
            }
        }
    });
}

let niftyChart = createSpotChart('niftySpotChart', 'NIFTY 50');
let sensexChart = createSpotChart('sensexSpotChart', 'SENSEX');

function updateChartTheme() {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
    niftyChart.options.scales.y.ticks.color = color;
    sensexChart.options.scales.y.ticks.color = color;
    niftyChart.update();
    sensexChart.update();
}

const sparklineConfig = {
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } }
    }
};

const optionCharts = {}; // Map of id -> chart instance

function renderOptionCard(containerId, op, isCall) {
    const container = document.getElementById(containerId);
    let card = document.getElementById(op.id);
    
    const cardClass = isCall ? 'call-card' : 'put-card';
    const typeClass = isCall ? 'ce' : 'pe';
    const arrowIcon = op.change >= 0 ? '<i data-lucide="arrow-up" style="width:14px;"></i>' : '<i data-lucide="arrow-down" style="width:14px;"></i>';
    const changeClass = op.change >= 0 ? 'up' : 'down';
    const trendPredict = op.change >= 0 ? 'BUY' : 'SELL';

    if (!card) {
        card = document.createElement('div');
        card.id = op.id;
        card.className = `option-card ${cardClass}`;
        card.innerHTML = `
            <div class="strike-info">
                <span class="strike-title">${op.strike}</span>
                <span class="strike-type ${typeClass}">${op.type} | ${trendPredict}</span>
            </div>
            <div class="mini-chart">
                <canvas id="canvas-${op.id}"></canvas>
            </div>
            <div class="premium-info">
                <span class="premium-val" id="prem-${op.id}">₹${formatCurrency(op.premium)}</span>
                <span class="premium-change ${changeClass}">${arrowIcon} ${Math.abs(op.change).toFixed(2)}%</span>
            </div>
        `;
        container.appendChild(card);
        lucide.createIcons({root: card});

        const ctx = document.getElementById(`canvas-${op.id}`).getContext('2d');
        const color = isCall ? '#10b981' : '#ef4444';
        
        optionChartsConfigMap[op.id] = Array(5).fill(op.premium);

        optionCharts[op.id] = new Chart(ctx, {
            ...sparklineConfig,
            data: {
                labels: ['1','2','3','4','5'],
                datasets: [{
                    data: optionChartsConfigMap[op.id],
                    borderColor: color,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.3
                }]
            }
        });
    } else {
        const premEl = document.getElementById(`prem-${op.id}`);
        const oldPrem = parseFloat(premEl.innerText.replace('₹', '').replace(/,/g, ''));
        premEl.innerText = `₹${formatCurrency(op.premium)}`;
        
        if (op.premium > oldPrem) {
            premEl.className = 'premium-val val-up';
        } else if (op.premium < oldPrem) {
            premEl.className = 'premium-val val-down';
        }

        setTimeout(() => { premEl.className = 'premium-val'; }, 400);

        const cht = optionCharts[op.id];
        if (cht) {
            optionChartsConfigMap[op.id].shift();
            optionChartsConfigMap[op.id].push(op.premium);
            cht.data.datasets[0].data = optionChartsConfigMap[op.id];
            cht.update();
        }
    }
}

function updateIndexSection(indexName, dataObj, sectionIdPrefix, callsId, putsId, chartInstance) {
    const spotEl = document.getElementById(`${sectionIdPrefix}-spot`);
    
    // Manage Chart History
    if(indexHistory[indexName][0] === null) {
        indexHistory[indexName].fill(dataObj.spot);
    }
    indexHistory[indexName].shift();
    indexHistory[indexName].push(dataObj.spot);
    
    const oldSpot = parseFloat(spotEl.innerText.replace(/,/g, ''));
    const isUpTick = dataObj.spot >= (oldSpot || dataObj.spot);

    spotEl.innerText = formatCurrency(dataObj.spot);
    spotEl.className = `price ${isUpTick ? 'run-up' : 'run-down'} ${isUpTick ? 'val-up' : 'val-down'}`;
    setTimeout(() => { spotEl.className = `price ${isUpTick ? 'run-up' : 'run-down'}`; }, 400);

    const badgeEl = document.getElementById(`${sectionIdPrefix}-trend-badge`);
    if (dataObj.trend === 'UP') {
        badgeEl.className = 'prediction-badge trend-up';
        badgeEl.innerHTML = `<i data-lucide="arrow-up-right"></i><span>ML TREND: UP</span><strong>(STRONG BUY)</strong>`;
    } else {
        badgeEl.className = 'prediction-badge trend-down';
        badgeEl.innerHTML = `<i data-lucide="arrow-down-right"></i><span>ML TREND: DOWN</span><strong>(STRONG SELL)</strong>`;
    }
    lucide.createIcons({root: badgeEl});

    // Update Main Chart
    chartInstance.data.datasets[0].data = indexHistory[indexName];
    const validData = indexHistory[indexName].filter(x => x !== null);
    const minVal = Math.min(...validData);
    const maxVal = Math.max(...validData);
    
    // scale pad
    const pad = indexName === 'NIFTY' ? 20 : 60;
    chartInstance.options.scales.y.min = minVal - pad;
    chartInstance.options.scales.y.max = maxVal + pad;
    chartInstance.update();

    // Reconcile DOM for Options
    const callsContainer = document.getElementById(callsId);
    const putsContainer = document.getElementById(putsId);
    
    const existingCalls = Array.from(callsContainer.children).map(c => c.id);
    const newCalls = dataObj.options.calls.map(c => c.id);
    if(existingCalls.join() !== newCalls.join()) { callsContainer.innerHTML = ''; }
    
    const existingPuts = Array.from(putsContainer.children).map(c => c.id);
    const newPuts = dataObj.options.puts.map(c => c.id);
    if(existingPuts.join() !== newPuts.join()) { putsContainer.innerHTML = ''; }

    dataObj.options.calls.forEach(op => renderOptionCard(callsId, op, true));
    dataObj.options.puts.forEach(op => renderOptionCard(putsId, op, false));
}

async function fetchMarketData() {
    try {
        console.log(`[${new Date().toLocaleTimeString()}] Fetching market data from backend...`);
        const response = await fetch('https://ai-tradingbackend.onrender.com/api/market-data');
        const data = await response.json();
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Data fetched successfully! NIFTY: ${data.nifty.spot}, SENSEX: ${data.sensex.spot}`);
        
        // Update Market Status
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.getElementById('market-status-text');
        
        if (data.is_open) {
            statusDot.className = 'status-dot pulsing';
            statusText.innerText = 'Market Open';
        } else {
            statusDot.className = 'status-dot closed';
            statusText.innerText = 'Market Closed';
        }
        
        // Update Top Tickers
        document.getElementById('top-nifty').innerText = formatCurrency(data.nifty.spot);
        document.getElementById('top-sensex').innerText = formatCurrency(data.sensex.spot);
        
        document.getElementById('top-nifty').style.color = data.nifty.trend === 'UP' ? 'var(--up-color)' : 'var(--down-color)';
        document.getElementById('top-sensex').style.color = data.sensex.trend === 'UP' ? 'var(--up-color)' : 'var(--down-color)';

        // Update Dashboards
        updateIndexSection('NIFTY', data.nifty, 'nifty', 'nifty-calls-container', 'nifty-puts-container', niftyChart);
        updateIndexSection('SENSEX', data.sensex, 'sensex', 'sensex-calls-container', 'sensex-puts-container', sensexChart);
        
    } catch (e) {
        console.error("Failed to fetch market data:", e);
        document.getElementById('market-status-text').innerText = 'Connection Error';
        document.querySelector('.status-dot').className = 'status-dot closed';
    }
}

// Initial fetch and loop
fetchMarketData();
setInterval(fetchMarketData, UPDATE_INTERVAL);

// --- AI Chart Analyzer ---
const analyzerBtn = document.getElementById('chart-analyzer-btn');
const modal = document.getElementById('analyzer-modal');
const closeModal = document.getElementById('close-modal-btn');
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('chart-upload-input');
const previewContainer = document.getElementById('preview-container');
const chartPreview = document.getElementById('chart-preview');
const analyzeActionBtn = document.getElementById('analyze-action-btn');
const analysisLoading = document.getElementById('analysis-loading');
const analysisResult = document.getElementById('analysis-result');

let currentFile = null;

analyzerBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    resetAnalyzer();
});

closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
});

function resetAnalyzer() {
    uploadZone.classList.remove('hidden');
    previewContainer.classList.add('hidden');
    analysisLoading.classList.add('hidden');
    analysisResult.classList.add('hidden');
    analysisResult.innerHTML = '';
    currentFile = null;
}

uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

// Drag and drop
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.style.borderColor = 'var(--up-color)'; });
uploadZone.addEventListener('dragleave', (e) => { e.preventDefault(); uploadZone.style.borderColor = 'var(--brand-accent)'; });
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--brand-accent)';
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});

// Paste support
document.addEventListener('paste', (e) => {
    if (modal.classList.contains('hidden')) return; // only when modal open
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
        if (item.type.indexOf('image') === 0) {
            handleFile(item.getAsFile());
        }
    }
});

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        chartPreview.src = e.target.result;
        uploadZone.classList.add('hidden');
        previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

analyzeActionBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    
    previewContainer.classList.add('hidden');
    analysisLoading.classList.remove('hidden');
    
    const formData = new FormData();
    formData.append('image', currentFile);
    
    try {
        const res = await fetch('https://ai-tradingbackend.onrender.com/api/analyze-chart', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        analysisLoading.classList.add('hidden');
        analysisResult.classList.remove('hidden');
        
        const trendClass = data.trend === 'UP' ? 'up' : 'down';
        const trendText = data.trend === 'UP' ? 'Bullish (Buy)' : 'Bearish (Sell)';
        
        analysisResult.innerHTML = `
            <div class="result-row">
                <span class="result-label">Detected Pattern (Primary):</span>
                <span class="result-val">${data.pattern}</span>
            </div>
            <div class="result-row">
                <span class="result-label">Overall Trend:</span>
                <span class="result-val ${trendClass}">${trendText}</span>
            </div>
            <div class="result-row">
                <span class="result-label">AI Confidence Score:</span>
                <span class="result-val">${data.confidence}%</span>
            </div>
            <div class="result-row">
                <span class="result-label" style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.5rem">${data.reasoning}</span>
            </div>
        `;
    } catch(e) {
        console.error("Analysis Failed:", e);
        analysisLoading.classList.add('hidden');
        analysisResult.classList.remove('hidden');
        analysisResult.innerHTML = `<p style="color:var(--down-color)">Failed to analyze image. Ensure backend is running.</p>`;
    }
});
