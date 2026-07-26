document.addEventListener('DOMContentLoaded', () => {
    const countdownEl = document.getElementById('countdown');
    const picker = document.getElementById('datetime-picker');
    const display = document.getElementById('stream-time-display');

    // Default target: Next Saturday 6 PM
    function getNextSaturdayTarget() {
        const now = new Date();
        const nextSaturday = new Date(now);
        
        const currentDay = now.getDay();
        const currentHour = now.getHours();
        
        let daysToAdd = (6 - currentDay + 7) % 7;
        
        if (currentDay === 6 && currentHour >= 18) {
            daysToAdd = 7;
        } else if (currentDay === 6) {
             daysToAdd = 0;
        }

        nextSaturday.setDate(now.getDate() + daysToAdd);
        nextSaturday.setHours(18, 0, 0, 0); // 6:00 PM Default
        
        return nextSaturday;
    }

    let targetDate = getNextSaturdayTarget();
    let timerInterval;

    // Shared numeric padding utility
    const pad = num => String(num).padStart(2, '0');

    // Helper formatting functions
    function formatForPicker(d) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function formatForDisplay(d) {
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const dayStr = days[d.getDay()];
        let h = d.getHours();
        let m = d.getMinutes();
        let ampm = h >= 12 ? 'PM' : 'AM';
        
        h = h % 12 || 12;
        let mStr = m > 0 ? `:${String(m).padStart(2, '0')}` : '';
        
        return `${dayStr} ${h}${mStr} ${ampm} EST`;
    }

    // Initialize visual component texts
    if (picker && display) {
        picker.value = formatForPicker(targetDate);
        display.textContent = formatForDisplay(targetDate);

        // Native Date & Time Picker Event Listener
        picker.addEventListener('change', (e) => {
            if (e.target.value) {
                targetDate = new Date(e.target.value);
                display.textContent = formatForDisplay(targetDate);
                
                // Reset and restart timer interval
                if (timerInterval) clearInterval(timerInterval);
                timerInterval = setInterval(updateTimer, 1000);
                updateTimer(); 
            }
        });
    }

    function updateTimer() {
        const now = new Date();
        const diff = targetDate.getTime() - now.getTime();
        
        if (diff <= 0) {
            countdownEl.textContent = "T- 00:00:00";
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            return;
        }
        
        const prefix = "T- ";

        const totalHours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        countdownEl.textContent = `${prefix}${pad(totalHours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    // Update every second
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer(); // Initial call


    // Toggle Stream Status Text
    const statusTagline = document.getElementById('status-tagline');
    const timerContainer = document.querySelector('.timer-wrapper');

    if (statusTagline) {
        statusTagline.addEventListener('click', () => {
            if (statusTagline.textContent === "Stream is Starting") {
                statusTagline.textContent = "Stream is Ending";
                if (timerContainer) {
                    timerContainer.style.display = 'none';
                }
            } else {
                statusTagline.textContent = "Stream is Starting";
                if (timerContainer) {
                    timerContainer.style.display = 'flex';
                }
            }
        });
    }

    // Fullscreen Toggle on Main Title Click
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    if (fullscreenToggle) {
        fullscreenToggle.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }

    // --- WebSocket Live Prices & 24h Change ---
    const priceElements = {
        'BTC': document.getElementById('price-BTC'),
        'ETH': document.getElementById('price-ETH'),
        'SOL': document.getElementById('price-SOL'),
        'XRP': document.getElementById('price-XRP'),
        'BNB': document.getElementById('price-BNB')
    };

    const changeElements = {
        'BTC': document.getElementById('change-BTC'),
        'ETH': document.getElementById('change-ETH'),
        'SOL': document.getElementById('change-SOL'),
        'XRP': document.getElementById('change-XRP'),
        'BNB': document.getElementById('change-BNB')
    };

    const previousPrices = {};
    const latestPrices = {}; // Buffer for throttled updates

    function updatePriceDisplay(coin, currentPrice, percent) {
        const el = priceElements[coin];
        const changeEl = changeElements[coin];
        if (!el) return;

        // 24H Change Update
        if (changeEl && percent !== undefined) {
            const formattedPercent = percent.toFixed(2);
            const numVal = parseFloat(formattedPercent);
            
            let symbol = '';
            let colorClass = '';
            
            if (numVal > 0) {
                symbol = '▲';
                colorClass = 'change-up';
            } else if (numVal < 0) {
                symbol = '▼';
                colorClass = 'change-down';
            } else {
                symbol = '●';
                colorClass = 'change-flat';
            }
            
            changeEl.innerHTML = `<span class="${colorClass}">${symbol} ${Math.abs(numVal).toFixed(2)}%</span>`;
        }

        // Ensure consistent decimal length for low-price coins like XRP
        const decimals = (currentPrice < 10 || coin === 'XRP') ? 4 : 2;
        const formattedNewPrice = `${currentPrice.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

        const oldPriceRaw = previousPrices[coin]?.raw;
        const oldPriceStr = previousPrices[coin]?.formatted || '---';

        if (oldPriceRaw === currentPrice) {
            return; // No price change
        }

        let directionClass = '';
        if (oldPriceRaw !== undefined) {
             directionClass = currentPrice > oldPriceRaw ? 'flash-up' : 'flash-down';
             
        }

        let diffIndex = 0;
        if (oldPriceStr !== '---') {
            while (diffIndex < formattedNewPrice.length && diffIndex < oldPriceStr.length && formattedNewPrice[diffIndex] === oldPriceStr[diffIndex]) {
                diffIndex++;
            }
        }

        if (diffIndex === formattedNewPrice.length || oldPriceStr === '---' || !directionClass) {
            el.innerHTML = formattedNewPrice;
        } else {
            const unchanged = formattedNewPrice.substring(0, diffIndex);
            const changed = formattedNewPrice.substring(diffIndex);
            el.innerHTML = `${unchanged}<span class="${directionClass}">${changed}</span>`;
        }

        previousPrices[coin] = { raw: currentPrice, formatted: formattedNewPrice };
    }

    // Update the UI only every 500ms to "reduce the speed" of visual changes
    let uiThrottleInterval = null;

    function startUIThrottle() {
        if (uiThrottleInterval) return;
        uiThrottleInterval = setInterval(() => {
            for (const coin in latestPrices) {
                if (latestPrices[coin]) {
                    const { price, percent } = latestPrices[coin];
                    updatePriceDisplay(coin, price, percent);
                    latestPrices[coin] = null; // Clear after update
                }
            }
        }, 500);
    }

    function stopUIThrottle() {
        if (uiThrottleInterval) {
            clearInterval(uiThrottleInterval);
            uiThrottleInterval = null;
        }
    }

    // Initialize the throttle
    startUIThrottle();

    // Pause DOM rendering cycles when the tab is in the background to save system resources
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopUIThrottle();
        } else {
            startUIThrottle();
        }
    });

    // WebSocket initialization utilizing Coinbase for high-liquidity US/Global tickers and automatic reconnection
    function initWebSocket() {
        const url = 'wss://ws-feed.exchange.coinbase.com';
        let ws = null;
        let reconnectTimer = null;

        function connect() {
            // Cancel any pending reconnect before starting a new connection
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }

            // Clean up previous connection & listeners to prevent leaks
            if (ws) {
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;
                ws.onopen = null;
                try { ws.close(); } catch (e) {}
                ws = null;
            }

            console.log(`Connecting to Coinbase WebSocket: ${url}`);
            ws = new WebSocket(url);

            ws.onopen = () => {
                console.log('Connected to Coinbase WebSocket. Subscribing to tickers...');
                const subscription = {
                    type: 'subscribe',
                    product_ids: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'BNB-USD'],
                    channels: ['ticker']
                };
                ws.send(JSON.stringify(subscription));
            };

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.type === 'ticker' && payload.product_id && payload.price && payload.open_24h) {
                        // Extract coin name (e.g. "BTC" from "BTC-USD")
                        const coin = payload.product_id.split('-')[0];
                        const currentPrice = parseFloat(payload.price);
                        const open24h = parseFloat(payload.open_24h);
                        
                        // Calculate 24h percentage change
                        const percentChange = ((currentPrice - open24h) / open24h) * 100;

                        latestPrices[coin] = { 
                            price: currentPrice, 
                            percent: percentChange 
                        };
                    }
                } catch (e) {
                    console.error('Error processing WebSocket message:', e);
                }
            };

            ws.onerror = () => {
                // Silence console errors for a clean UX
            };

            ws.onclose = () => {
                console.log('Coinbase WebSocket disconnected. Retrying in 3 seconds...');
                reconnectTimer = setTimeout(connect, 3000);
            };
        }

        // Clean up all timers and WebSocket when the page is closed
        window.addEventListener('beforeunload', () => {
            clearTimeout(reconnectTimer);
            if (ws) {
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;
                ws.onopen = null;
                try { ws.close(); } catch (e) {}
                ws = null;
            }
        });

        connect();
    }

    // Clean up intervals when the page is closed
    window.addEventListener('beforeunload', () => {
        clearInterval(timerInterval);
        clearInterval(uiThrottleInterval);
    });

    initWebSocket();
});
