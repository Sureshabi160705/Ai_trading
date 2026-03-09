// ==================== DARK MODE ====================
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');
    
    if (!darkModeToggle || !darkModeIcon) {
        console.error('Dark mode elements not found');
        return;
    }
    
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Set initial state
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeIcon.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        darkModeIcon.textContent = '🌙';
    }
    
    // Add click handler
    darkModeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark.toString());
        
        // Update emoji
        darkModeIcon.textContent = isDark ? '☀️' : '🌙';
        console.log('Dark mode toggled:', isDark);
    });
}

// Update timer
function updateTimer() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });
    document.getElementById('timer').textContent = timeString;
}

// Check if market is open (9:15 AM to 3:30 PM IST)
function isMarketOpen() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const totalMinutes = hours * 60 + minutes;
    const openMinutes = 9 * 60 + 15; // 9:15 AM
    const closeMinutes = 15 * 60 + 30; // 3:30 PM
    return totalMinutes >= openMinutes && totalMinutes <= closeMinutes;
}


// Load data for selected index
async function loadIndexData(index) {
    currentIndex = index;
    // Chart title removed
    console.log(`Loading data for ${index}...`);

    try {
        const response = await fetch(`/api/index/${index}`);
        const data = await response.json();
        console.log('API response:', data);

        if (data.error) {
            console.error('Error loading data:', data.error);
            return;
        }

        if (!data.candles || data.candles.length === 0) {
            console.error('No candle data received');
            return;
        }

        // Chart data and fitContent removed

        // Update signal
        document.getElementById('signal').textContent = data.signal;
        document.getElementById('signal').className = data.signal.includes('CALL') ? 'text-success' : 'text-danger';

        // Update indicators
        if (data.indicators) {
            document.getElementById('rsi-value').textContent = data.indicators.rsi.toFixed(2);
            document.getElementById('rsi-bar').style.width = `${Math.min(data.indicators.rsi, 100)}%`;
            document.getElementById('macd-value').textContent = data.indicators.macd.toFixed(4);
            document.getElementById('sma20-value').textContent = data.indicators.sma20.toFixed(2);
        }

    } catch (error) {
        console.error('Error loading index data:', error);
        // Chart error message removed
    }
}

// Load live prices
async function loadLivePrices() {
    try {
        const response = await fetch('/api/live_prices');
        const prices = await response.json();
        console.log('Live prices fetched', prices);

        document.getElementById('nifty-price').textContent = prices.nifty.toFixed(2);
        document.getElementById('banknifty-price').textContent = prices.banknifty.toFixed(2);
        document.getElementById('sensex-price').textContent = prices.sensex.toFixed(2);

    } catch (error) {
        console.error('Error loading live prices:', error);
        const niftyElem = document.getElementById('nifty-price');
        if (niftyElem) {
            niftyElem.textContent = 'Error';
        }
    }
}

// Show market closed message
function showMarketClosed() {
    document.getElementById('nifty-price').textContent = 'Market Closed';
    document.getElementById('banknifty-price').textContent = '';
    document.getElementById('sensex-price').textContent = '';
}

// Train AI model
async function trainModel() {
    try {
        const response = await fetch(`/api/train/${currentIndex}`);
        const result = await response.json();

        if (result.message) {
            alert('Model trained successfully!');
            // Reload data with new model
            loadIndexData(currentIndex);
        } else {
            alert('Error training model: ' + result.error);
        }

    } catch (error) {
        console.error('Error training model:', error);
        alert('Error training model');
    }
}

// Index selection
function selectIndex(index) {
    loadIndexData(index);
}

// Dive into index with TradingView chart and best options
function diveIntoIndex(index) {
    document.getElementById('indexDiveModalLabel').textContent = index.toUpperCase() + ' - Best Options to Trade';
    loadTradingViewChart(index);
    loadBestOptions(index);
    const modal = new bootstrap.Modal(document.getElementById('indexDiveModal'));
    modal.show();
}

// Load TradingView widget for the selected index
function loadTradingViewChart(index) {
    const container = document.getElementById('tv_chart_container');
    container.innerHTML = ''; // Clear previous widget
    
    // Map index to TradingView symbol
    const symbols = {
        'nifty': 'NSE:NIFTY50',
        'banknifty': 'NSE:BANKNIFTY',
        'sensex': 'BSE:SENSEX'
    };
    const symbol = symbols[index] || 'NSE:NIFTY50';
    
    // Create and append TradingView script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.onload = function() {
        if (window.TradingView) {
            new window.TradingView.widget({
                autosize: true,
                symbol: symbol,
                interval: '5',
                timezone: 'Asia/Kolkata',
                theme: 'light',
                style: '1',
                locale: 'en',
                toolbar_bg: '#f1f3f6',
                enable_publishing: false,
                allow_symbol_change: false,
                container_id: 'tv_chart_container',
                hide_top_toolbar: false,
                hide_legend: false
            });
        }
    };
    container.appendChild(script);
}

// Load best options from backend
async function loadBestOptions(index) {
    try {
        const response = await fetch(`/api/best_options/${index}`);
        const data = await response.json();
        const tbody = document.getElementById('bestOptionsTableBody');
        tbody.innerHTML = '';
        
        if (data && data.options && data.options.length > 0) {
            data.options.forEach(opt => {
                if (opt.expected_profit >= 10) {
                    const row = `<tr><td><strong>${opt.option_name}</strong></td><td>${opt.option_type}</td><td class="text-success"><strong>+${opt.expected_profit}pt</strong></td></tr>`;
                    tbody.innerHTML += row;
                }
            });
            if (tbody.innerHTML === '') {
                tbody.innerHTML = '<tr><td colspan="3">No options with ≥10pt profit available</td></tr>';
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="3">No options data available</td></tr>';
        }
    } catch (error) {
        console.error('Error loading best options:', error);
        document.getElementById('bestOptionsTableBody').innerHTML = '<tr><td colspan="3">Error loading options</td></tr>';
    }
}

// --- Manual Mode: Image Paste & Upload Handlers ---
let pastedImageFile = null;
let imageAnalysisCache = {}; // Cache for image analysis results

function initializeManualMode() {
    const pasteArea = document.getElementById('pasteArea');
    const manualForm = document.getElementById('manualUploadForm');
    
    if (!pasteArea || !manualForm) return;
    
    // Handle paste into paste area
    pasteArea.addEventListener('paste', handleImagePaste);
    pasteArea.addEventListener('click', () => document.getElementById('chartImage').click());
    
    // Handle file input change
    document.getElementById('chartImage').addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            pastedImageFile = e.target.files[0];
            displayImagePreview(e.target.files[0]);
        }
    });
    
    // Handle form submission
    manualForm.addEventListener('submit', function(e) {
        e.preventDefault();
        analyzeChartImage();
    });
    
    // Global paste handler
    document.addEventListener('paste', function(e) {
        const manualPanel = document.getElementById('manualModePanel');
        if (manualPanel && manualPanel.style.display !== 'none') {
            handleImagePaste(e);
        }
    });
}

function handleImagePaste(e) {
    e.preventDefault();
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            pastedImageFile = file;
            displayImagePreview(file);
            return;
        }
    }
}

function displayImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('pastedImg').src = e.target.result;
        document.getElementById('pastedImagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Generate hash of file for caching
async function getFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function analyzeChartImage() {
    if (!pastedImageFile) {
        alert('Please upload or paste an image first');
        return;
    }
    
    try {
        // Get file hash for caching
        const fileHash = await getFileHash(pastedImageFile);
        
        // Check if we have cached result for this image
        if (imageAnalysisCache[fileHash]) {
            console.log('Using cached analysis result for image');
            const data = imageAnalysisCache[fileHash];
            displayAnalysisResult(data);
            return;
        }
        
        // Show loading state
        document.getElementById('detectedPattern').textContent = 'Analyzing...';
        document.getElementById('patternType').textContent = '-';
        document.getElementById('trendPrediction').textContent = '-';
        document.getElementById('manualConfidence').textContent = '-';
        
        const formData = new FormData();
        formData.append('image', pastedImageFile);
        
        const response = await fetch('/api/analyze_chart', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Error analyzing chart: ' + data.error);
            return;
        }
        
        // Cache the result
        imageAnalysisCache[fileHash] = data;
        
        // Display results
        displayAnalysisResult(data);
        
    } catch (error) {
        console.error('Error analyzing chart:', error);
        alert('Error analyzing chart: ' + error.message);
    }
}

function displayAnalysisResult(data) {
    document.getElementById('detectedPattern').textContent = data.pattern || '-';
    document.getElementById('patternType').textContent = data.pattern_type || '-';
    document.getElementById('trendPrediction').textContent = data.trend_prediction || '-';
    document.getElementById('manualConfidence').textContent = (data.confidence || 0) + '%';
    document.getElementById('manualResult').style.display = 'block';
}

// AUTO MODE FUNCTIONS
let currentSelectedIndex = null;

async function loadAutoPredictions() {
    try {
        const response = await fetch('/api/auto-predictions');
        const data = await response.json();
        
        if (data.status !== 'success' || !data.predictions) {
            console.error('Error loading auto predictions:', data.error);
            return;
        }
        
        console.log('Auto predictions loaded:', data.predictions);
        updateAutoModeTable(data.predictions);
        
    } catch (error) {
        console.error('Error loading auto predictions:', error);
    }
}

function updateAutoModeTable(predictions) {
    const tbody = document.getElementById('autoModeTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const indexOrder = ['NIFTY', 'BANKNIFTY', 'SENSEX'];
    
    // Sort predictions by index order
    const sortedPredictions = predictions.sort((a, b) => {
        return indexOrder.indexOf(a.index) - indexOrder.indexOf(b.index);
    });
    
    sortedPredictions.forEach(pred => {
        const indexLower = pred.index.toLowerCase();
        const row = document.createElement('tr');
        
        // Determine color based on prediction
        const predictionColor = pred.prediction === 'BULLISH' ? 'text-success' : 
                                pred.prediction === 'BEARISH' ? 'text-danger' : 'text-warning';
        
        row.innerHTML = `
            <td><a href="#" onclick="diveIntoIndex('${indexLower}'); return false;">${pred.index}</a></td>
            <td>${pred.current_price.toFixed(2)}</td>
            <td class="${predictionColor}"><strong>${pred.prediction}</strong></td>
            <td>${pred.recommended_trade}</td>
            <td>${pred.best_strike}</td>
            <td>${pred.confidence}%</td>
        `;
        
        tbody.appendChild(row);
    });
}

async function diveIntoIndex(indexName) {
    currentSelectedIndex = indexName;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('indexDiveModal'));
    modal.show();
    
    // Load chart data
    loadIndexChartData(indexName);
    
    // Load best options
    loadBestOptionsForIndex(indexName);
}

async function loadIndexChartData(indexName) {
    try {
        const response = await fetch(`/api/index/${indexName}`);
        const data = await response.json();
        
        if (data.error) {
            console.error('Error loading chart:', data.error);
            return;
        }
        
        // Create TradingView-like chart using Plotly
        if (data.candles && data.candles.length > 0) {
            createCandleChart(data.candles, indexName);
        }
        
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

function createCandleChart(candles, indexName) {
    const container = document.getElementById('tv_chart_container');
    if (!container) return;
    
    // Prepare data for Plotly
    const dates = candles.map(c => new Date(c.time * 1000));
    
    const candleTrace = {
        x: dates,
        open: candles.map(c => c.open),
        high: candles.map(c => c.high),
        low: candles.map(c => c.low),
        close: candles.map(c => c.close),
        type: 'candlestick',
        name: indexName.toUpperCase()
    };
    
    const layout = {
        title: `${indexName.toUpperCase()} - 5 Min Chart`,
        yaxis: { title: 'Price' },
        xaxis: { title: 'Time' },
        template: 'plotly_dark',
        height: 450,
        margin: { l: 50, r: 50, t: 50, b: 50 }
    };
    
    Plotly.newPlot(container, [candleTrace], layout, { responsive: true });
}

async function loadBestOptionsForIndex(indexName) {
    try {
        const response = await fetch(`/api/auto-predictions`);
        const data = await response.json();
        
        if (data.status !== 'success') {
            console.error('Error loading predictions');
            return;
        }
        
        // Find the prediction for the selected index
        const prediction = data.predictions.find(p => 
            p.index.toLowerCase() === indexName.toLowerCase()
        );
        
        if (!prediction || !prediction.best_options) {
            return;
        }
        
        // Update table with best options
        const tbody = document.getElementById('bestOptionsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        prediction.best_options.forEach(opt => {
            const row = document.createElement('tr');
            const profitColor = opt.profit_potential > 30 ? 'text-success' : 
                               opt.profit_potential > 15 ? 'text-info' : 'text-warning';
            
            row.innerHTML = `
                <td><strong>${opt.strike} ${opt.option_type}</strong></td>
                <td>${opt.option_type}</td>
                <td class="${profitColor}"><strong>+${opt.profit_potential.toFixed(1)}pt</strong></td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading best options:', error);
    }
}

function setMode(mode) {
    const autoPanel = document.getElementById('autoModePanel');
    const manualPanel = document.getElementById('manualModePanel');
    const autoBtn = document.getElementById('autoModeBtn');
    const manualBtn = document.getElementById('manualModeBtn');
    
    if (mode === 'auto') {
        autoPanel.style.display = 'block';
        manualPanel.style.display = 'none';
        autoBtn.classList.add('active');
        manualBtn.classList.remove('active');
        loadAutoPredictions();
        // Refresh auto predictions every 10 seconds
        if (!window.autoPredictionInterval) {
            window.autoPredictionInterval = setInterval(loadAutoPredictions, 10000);
        }
    } else {
        autoPanel.style.display = 'none';
        manualPanel.style.display = 'block';
        manualBtn.classList.add('active');
        autoBtn.classList.remove('active');
        if (window.autoPredictionInterval) {
            clearInterval(window.autoPredictionInterval);
            window.autoPredictionInterval = null;
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initDarkMode();
    loadLivePrices();
    loadIndexData('nifty');
    initializeManualMode();
    loadAutoPredictions();

    // Update timer every second
    updateTimer();
    setInterval(updateTimer, 1000);

    // Update live prices every 1 second during market hours
    setInterval(() => {
        if (isMarketOpen()) {
            loadLivePrices();
        } else {
            showMarketClosed();
        }
    }, 1000);
    
    // Auto refresh predictions every 10 seconds when in auto mode
    setInterval(() => {
        if (document.getElementById('autoModePanel').style.display !== 'none') {
            loadAutoPredictions();
        }
    }, 10000);
    
    // Load Plotly library for charts
    const script = document.createElement('script');
    script.src = 'https://cdn.plot.ly/plotly-latest.min.js';
    document.head.appendChild(script);
});