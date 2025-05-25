const stableCoins = [
    "USDT", "BUSD", "USDC", "TUSD", "USDP", "DAI", "FDUSD", "SUSD", "EUR", "GBP", "TRY", "BRL", "IDRT", "UAH", "NGN", "ZAR", "RUB", "VAI"
];
const patternList = [
    {en:"Double Bottom", ar:"القاع الثنائي"},
    {en:"Triple Top", ar:"القمة الثلاثية"},
    {en:"Triple Bottom", ar:"القاع الثلاثي"},
    {en:"Head & Shoulders", ar:"الرأس والكتفين"},
    {en:"Inverted Head & Shoulders", ar:"الرأس والكتفين المقلوب"},
    {en:"Symmetrical Triangle", ar:"المثلث المتماثل"},
    {en:"Ascending Triangle", ar:"المثلث الصاعد"},
    {en:"Descending Triangle", ar:"المثلث الهابط"},
    {en:"Boarding Pattern", ar:"النموذج المتباعد"},
    {en:"Rectangle", ar:"المستطيل"},
    {en:"Flags & Pennants", ar:"الأعلام والأعلام المثلثة"},
    {en:"Rising Wedge", ar:"الوتد الصاعد"},
    {en:"Falling Wedge", ar:"الوتد الهابط"},
    {en:"Rounding Tops", ar:"القمم المستديرة"},
    {en:"Rounding Bottoms", ar:"القيعان المستديرة"},
    {en:"V Top Pattern", ar:"القمة V"},
    {en:"V Bottom Pattern", ar:"القاع V"}
];

// ---- الحصول على أزواج USDT Spot فقط ----
async function getSpotPairs() {
    const res = await fetch("https://api.binance.com/api/v3/exchangeInfo");
    const data = await res.json();
    return data.symbols.filter(s =>
        s.status === "TRADING" &&
        s.isSpotTradingAllowed &&
        s.symbol.endsWith("USDT") &&
        !stableCoins.includes(s.baseAsset) &&
        !stableCoins.includes(s.quoteAsset) &&
        !s.symbol.includes("UPUSDT") && !s.symbol.includes("DOWNUSDT") &&
        !s.symbol.includes("BULLUSDT") && !s.symbol.includes("BEARUSDT")
    ).map(s => s.symbol);
}

// ---- جلب بيانات العملة ----
async function getCoinData(symbol) {
    const [ticker, klines] = await Promise.all([
        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`).then(r=>r.json()),
        fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=120`).then(r=>r.json())
    ]);
    return {ticker, klines};
}

// ---- اكتشاف الأنماط ----
function detectPatterns(klines) {
    // استخراج الأسعار للإغلاق فقط
    const closes = klines.map(k=>parseFloat(k[4]));
    // Double Bottom (قاع ثنائي)
    let db = findDoubleBottom(closes);
    if (db) return db;

    // Triple Top (قمة ثلاثية)
    let tt = findTripleTop(closes);
    if (tt) return tt;

    // Triple Bottom (قاع ثلاثي)
    let tb = findTripleBottom(closes);
    if (tb) return tb;

    // Ascending Triangle (ممكن توسعة)
    let at = findAscendingTriangle(closes);
    if (at) return at;

    // Descending Triangle (ممكن توسعة)
    let dt = findDescendingTriangle(closes);
    if (dt) return dt;

    return null;
}
function findDoubleBottom(arr) {
    if(arr.length < 40) return null;
    // ابحث عن قاعين متساويين تقريبًا بفارق بسيط بينهم وارتفاع في المنتصف
    for(let i=10;i<arr.length-20;i++) {
        for(let j=i+6;j<arr.length-10;j++) {
            let b1 = arr[i], b2 = arr[j], diff = Math.abs(b1-b2)/b1;
            if(diff < 0.035) {
                let highBetween = Math.max(...arr.slice(i,j));
                if(highBetween > b1*1.07) {
                    return {
                        name: "القاع الثنائي",
                        details: `تم رصد قاعين متقاربين في السعر مع ارتفاع واضح بينهما. النموذج يشير لاحتمالية انعكاس إيجابي.`,
                        targets: [`الهدف الأول: ${(highBetween+(highBetween-b1)*0.6).toFixed(4)}`, `وقف الخسارة: ${(Math.min(b1,b2)*0.96).toFixed(4)}`],
                        confirmed: arr[arr.length-1]>highBetween
                    };
                }
            }
        }
    }
    return null;
}
function findTripleTop(arr) {
    if(arr.length < 60) return null;
    // ابحث عن 3 قمم متقاربة
    for(let i=10;i<arr.length-30;i++) {
        let top1 = arr[i];
        let js = [i+8,i+20];
        let tops = [top1, arr[js[0]], arr[js[1]]];
        let diffs = [Math.abs(top1-tops[1])/top1, Math.abs(top1-tops[2])/top1];
        if(diffs[0]<0.03 && diffs[1]<0.03) {
            let minBetween = Math.min(...arr.slice(i+1,js[2]));
            if(minBetween<top1*0.97) {
                return {
                    name: "القمة الثلاثية",
                    details: `تم رصد ثلاث قمم سعرية متقاربة، غالباً ما يشير هذا النموذج لانعكاس هبوطي.`,
                    targets: [`الهدف الأول: ${(minBetween-(top1-minBetween)*0.7).toFixed(4)}`, `وقف الخسارة: ${(top1*1.04).toFixed(4)}`],
                    confirmed: arr[arr.length-1]<minBetween
                };
            }
        }
    }
    return null;
}
function findTripleBottom(arr) {
    if(arr.length < 60) return null;
    for(let i=10;i<arr.length-30;i++) {
        let bot1 = arr[i];
        let js = [i+8,i+20];
        let bots = [bot1, arr[js[0]], arr[js[1]]];
        let diffs = [Math.abs(bot1-bots[1])/bot1, Math.abs(bot1-bots[2])/bot1];
        if(diffs[0]<0.03 && diffs[1]<0.03) {
            let maxBetween = Math.max(...arr.slice(i+1,js[2]));
            if(maxBetween>bot1*1.07) {
                return {
                    name: "القاع الثلاثي",
                    details: `تم رصد ثلاث قيعان سعرية متقاربة مع ارتفاع بينهما مما يشير لاحتمالية انعكاس إيجابي.`,
                    targets: [`الهدف الأول: ${(maxBetween+(maxBetween-bot1)*0.6).toFixed(4)}`, `وقف الخسارة: ${(bot1*0.96).toFixed(4)}`],
                    confirmed: arr[arr.length-1]>maxBetween
                };
            }
        }
    }
    return null;
}
function findAscendingTriangle(arr) {
    // مقاومة أفقية وقاع صاعد
    let len = arr.length;
    if(len<30) return null;
    let resistance = Math.max(...arr.slice(len-25));
    let support = Math.min(...arr.slice(len-25));
    let lows = arr.slice(len-25);
    let isAscending = true;
    for(let i=1;i<lows.length;i++) if(lows[i]<lows[i-1]) isAscending=false;
    if(isAscending && arr[len-1]>resistance*0.99) {
        return {
            name: "المثلث الصاعد",
            details: `تم رصد مقاومة أفقية مع قيعان صاعدة. عادة ما يشير هذا النموذج لاستمرار الصعود بعد اختراق المقاومة.`,
            targets: [`الهدف الأول: ${(resistance+(resistance-support)*0.7).toFixed(4)}`, `وقف الخسارة: ${(support*0.98).toFixed(4)}`],
            confirmed: arr[len-1]>resistance*1.01
        };
    }
    return null;
}
function findDescendingTriangle(arr) {
    // دعم أفقي وقمة هابطة
    let len = arr.length;
    if(len<30) return null;
    let support = Math.min(...arr.slice(len-25));
    let highs = arr.slice(len-25);
    let isDescending = true;
    for(let i=1;i<highs.length;i++) if(highs[i]>highs[i-1]) isDescending=false;
    if(isDescending && arr[len-1]<support*1.01) {
        return {
            name: "المثلث الهابط",
            details: `تم رصد دعم أفقي مع قمم هابطة. غالباً ما يشير لاستمرار الهبوط بعد كسر الدعم.`,
            targets: [`الهدف الأول: ${(support-(Math.max(...arr.slice(len-25))-support)*0.7).toFixed(4)}`, `وقف الخسارة: ${(Math.max(...arr.slice(len-25))*1.02).toFixed(4)}`],
            confirmed: arr[len-1]<support*0.99
        };
    }
    return null;
}

// ---- بناء البطاقة ----
function createCard(symbol, ticker, pattern) {
    const name = symbol.replace("USDT", "");
    const logo = name[0];
    const price = parseFloat(ticker.lastPrice).toFixed(5);
    const change = parseFloat(ticker.priceChangePercent);
    const changeCls = change>=0 ? 'up' : 'down';
    const arrow = change>=0 ? '▲' : '▼';
    const liquidity = parseFloat(ticker.quoteVolume).toLocaleString();
    const vol = parseFloat(ticker.volume).toLocaleString();
    return `
    <div class="card" data-symbol="${symbol}" tabindex="0">
        <div class="coin-logo">${logo}</div>
        <div class="card-title">${name} <span class="symbol">/USDT</span></div>
        <div class="price-section">
            <span class="price">$${price}</span>
            <span class="change ${changeCls}"><span class="change-arrow">${arrow}</span>${change.toFixed(2)}%</span>
        </div>
        <div class="liquidity">حجم السيولة: ${liquidity} $</div>
        <div class="volume">حجم التداول: ${vol}</div>
        <div class="pattern-name">${pattern.name}</div>
        <button class="show-more">تفاصيل النموذج</button>
    </div>
    `;
}
function showModal(symbol, ticker, pattern) {
    let html = `
    <h2>${symbol.replace("USDT","")} / USDT</h2>
    <div style="margin:0.8em 0;">
        <b>النموذج:</b> ${pattern.name}
    </div>
    <div class="pattern-details">${pattern.details}</div>
    <div class="pattern-targets">
        <div>${pattern.targets[0]}</div>
        <div>${pattern.targets[1]}</div>
        <div>تأكيد الاختراق: <b style="color:${pattern.confirmed?'#2ed573':'#ff5e5e'};">${pattern.confirmed?'تم التأكيد':'غير مؤكد'}</b></div>
    </div>
    <div style="margin-top:1em; color:#bbb; font-size:.95em;">
        <b>السعر:</b> $${parseFloat(ticker.lastPrice).toFixed(5)}<br>
        <b>التغير 24 ساعة:</b> ${parseFloat(ticker.priceChangePercent).toFixed(2)}%<br>
        <b>حجم السيولة:</b> ${parseFloat(ticker.quoteVolume).toLocaleString()} $<br>
        <b>حجم التداول:</b> ${parseFloat(ticker.volume).toLocaleString()}
    </div>
    `;
    document.getElementById("modal-details").innerHTML = html;
    document.getElementById("modal").style.display = "flex";
}

// ---- التنفيذ الرئيسي ----
async function main() {
    const container = document.getElementById("cards-container");
    container.innerHTML = "<div style='grid-column:1/-1;text-align:center;color:#aaa;font-size:1.2rem'>جاري تحميل وتحليل العملات ...</div>";
    let pairs = await getSpotPairs();
    let results = [];
    // تحليل العملات على دفعات لعدم إرهاق Binance
    for(let i=0;i<pairs.length;i+=15) {
        let batch = pairs.slice(i,i+15);
        let batchData = await Promise.all(batch.map(async symbol=>{
            try{
                let {ticker, klines} = await getCoinData(symbol);
                let pattern = detectPatterns(klines);
                if(pattern) return {symbol, ticker, pattern};
            }catch(e){return null;}
        }));
        results = results.concat(batchData.filter(Boolean));
        // تحديث البطاقات تدريجياً
        if(i%30===0) renderCards(container, results);
        await new Promise(res=>setTimeout(res, 400));
    }
    renderCards(container, results);
}
function renderCards(container, results) {
    if(!results.length) {
        container.innerHTML = "<div style='grid-column:1/-1;text-align:center;color:#aaa;font-size:1.2rem'>لم يتم العثور على أنماط فنية حالياً.</div>";
        return;
    }
    container.innerHTML = results.map(r => createCard(r.symbol, r.ticker, r.pattern)).join("");
    // ربط الحدث لعرض تفاصيل النموذج
    document.querySelectorAll(".card .show-more").forEach(btn=>{
        btn.onclick = e => {
            let card = btn.closest(".card");
            let symbol = card.getAttribute("data-symbol");
            let found = results.find(r=>r.symbol===symbol);
            showModal(found.symbol, found.ticker, found.pattern);
        }
    });
}
document.getElementById("close-modal").onclick = ()=> document.getElementById("modal").style.display="none";
window.onclick = e=>{
    if(e.target.id==="modal") document.getElementById("modal").style.display="none";
}
// بدء التشغيل
main();