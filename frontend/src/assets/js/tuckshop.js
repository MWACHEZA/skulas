// Tuckshop Management Logic

// --- Helper Functions ---
function formatCurrency(amount, currency = 'USD') {
    const symbols = {
        'USD': '$',
        'ZAR': 'R',
        'ZiG': 'ZiG '
    };
    const symbol = symbols[currency] || '$';
    return symbol + parseFloat(amount).toFixed(2);
}

function showNotification(message, type = 'success') {
    // Check if window.showNotification exists and is NOT this function to avoid recursion
    if (window.showNotification && window.showNotification !== showNotification) {
        window.showNotification(message, type);
    } else {
        // Fallback for standalone testing or if recursion is detected
        const toast = document.createElement('div');
        toast.className = `ancillary-toast toast-${type}`;
        Object.assign(toast.style, {
            position: 'fixed', bottom: '30px', right: '30px',
            background: type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#0056b3'),
            color: 'white', padding: '15px 25px', borderRadius: '12px',
            zIndex: '9999', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        });
        toast.innerHTML = `<span>${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// --- Data Models (LocalStorage) ---

const DB_KEYS = {
    INVENTORY: 'tuckshopInventory',
    SALES: 'tuckshopSales',
    ORDERS: 'tuckshopOrders',
    CATEGORIES: 'tuckshopCategories'
};

// Initial Data Seeding
function seedData() {
    if (getTenantData(DB_KEYS.INVENTORY, 'null') === null) {
        const items = [
            { id: '1', name: 'Cheese Puffs', category: 'Snacks', price: 0.50, priceZAR: 10.00, priceZiG: 15.00, stock: 45, threshold: 10 },
            { id: '2', name: 'Apple Juice (300ml)', category: 'Drinks', price: 1.00, priceZAR: 20.00, priceZiG: 30.00, stock: 20, threshold: 15 },
            { id: '3', name: 'Meat Pie', category: 'Hot Food', price: 1.50, priceZAR: 30.00, priceZiG: 45.00, stock: 12, threshold: 5 },
            { id: '4', name: 'Chocolate Bar', category: 'Sweets', price: 0.75, priceZAR: 15.00, priceZiG: 22.50, stock: 60, threshold: 20 }
        ];
        saveTenantData(DB_KEYS.INVENTORY, items);
    }
    if (getTenantData(DB_KEYS.CATEGORIES, 'null') === null) {
        const categories = ["Snacks", "Drinks", "Hot Food", "Sweets", "Stationery"];
        saveTenantData(DB_KEYS.CATEGORIES, categories);
    }
    if (getTenantData(DB_KEYS.SALES, 'null') === null) {
        // Some mock sales for stats
        const sales = [
            { id: 'S1001', date: new Date().toISOString(), total: 2.50, items: [{ name: 'Meat Pie', qty: 1 }, { name: 'Apple Juice', qty: 1 }] },
            { id: 'S1002', date: new Date().toISOString(), total: 1.00, items: [{ name: 'Cheese Puffs', qty: 2 }] }
        ];
        saveTenantData(DB_KEYS.SALES, sales);
    }
    if (getTenantData(DB_KEYS.ORDERS, 'null') === null) {
        const orders = [
            { id: 'PO-092123', date: '2026-01-05', supplier: 'Macro Cash', items: '20x Cases Cola', status: 'Pending', note: 'Deliver to back door' }
        ];
        saveTenantData(DB_KEYS.ORDERS, orders);
    }
}

// Inventory Operations
function getInventory() {
    seedData();
    return getTenantData(DB_KEYS.INVENTORY, '[]');
}

function saveInventory(items) {
    saveTenantData(DB_KEYS.INVENTORY, items);
}

function addProduct(product) {
    const items = getInventory();

    // Safety check for ID and required fields
    if (!product.id) product.id = Date.now().toString();
    if (!product.category) product.category = 'General';
    if (isNaN(product.price)) product.price = 0;
    if (isNaN(product.priceZAR)) product.priceZAR = 0;
    if (isNaN(product.priceZiG)) product.priceZiG = 0;
    if (isNaN(product.stock)) product.stock = 0;

    items.push(product);
    saveInventory(items);

    if (window.AuditLogger) {
        AuditLogger.log('Add Inventory Item', `Added product: ${product.name} (Cat: ${product.category}, USD: ${product.price}, ZAR: ${product.priceZAR}, ZiG: ${product.priceZiG})`, AuditLogger.SEVERITY.INFO, 'Ancillary', 'Tuckshop');
    }

    showNotification('Product saved to inventory: ' + product.name);

    // Explicitly refresh inventory table if we are on the inventory page
    if (window.location.href.includes('inventory')) {
        renderInventoryTable();
    }
}

function updateStock(id, qtyChange) {
    const items = getInventory();
    const item = items.find(i => i.id === id);
    if (item) {
        item.stock += qtyChange;
        saveInventory(items);
    }
}


// Category Operations
function getCategories() {
    seedData();
    return getTenantData(DB_KEYS.CATEGORIES, '["Snacks", "Drinks", "Hot Food", "Sweets", "Stationery"]');
}

function saveCategories(cats) {
    saveTenantData(DB_KEYS.CATEGORIES, cats);
    updateCategoryDropdowns();
}

function updateCategoryDropdowns() {
    const cats = getCategories();
    const selects = ['prodCat', 'editProdCat'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const currentVal = el.value;
            el.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
            if (cats.includes(currentVal)) el.value = currentVal;
        }
    });
}

function openAddCategoryModal(selectId) {
    document.getElementById('targetSelectId').value = selectId;
    document.getElementById('newCategoryName').value = '';
    openModal('addCategoryModal');
}

function addNewCategory(name, targetSelectId) {
    if (name && name.trim()) {
        const cats = getCategories();
        const trimmedName = name.trim();
        if (!cats.includes(trimmedName)) {
            cats.push(trimmedName);
            saveCategories(cats);
            showNotification(`Category added: ${trimmedName}`);
        }
        document.getElementById(targetSelectId).value = trimmedName;
        closeModal('addCategoryModal');
    }
}

// Sales Operations
function recordSale(cartItems, metadata = {}) {
    const items = getInventory();
    const sales = getTenantData(DB_KEYS.SALES, '[]');
    let total = 0;

    // Validate stock first
    for (let cartItem of cartItems) {
        const item = items.find(i => i.id === cartItem.id);
        if (!item || item.stock < cartItem.qty) {
            showNotification(`Insufficient stock for ${cartItem.name}`, 'error');
            return false;
        }
    }

    // Deduct stock and calculate total
    cartItems.forEach(cartItem => {
        const item = items.find(i => i.id === cartItem.id);
        if (!item) return; // Null check

        const cur = metadata.currency || 'USD';
        const price = (cur === 'USD' ? item.price : (cur === 'ZAR' ? item.priceZAR : item.priceZiG));

        item.stock -= cartItem.qty;
        total += price * cartItem.qty;
    });

    saveInventory(items);

    const sale = {
        id: 'S' + Date.now().toString().slice(-6),
        date: new Date().toISOString(),
        total: total,
        currency: metadata.currency || 'USD',
        paymentMethod: metadata.paymentMethod || 'Cash',
        amountPaid: metadata.amountPaid || total,
        changeGiven: metadata.changeGiven || 0,
        buyerName: metadata.buyerName || 'Walk-in',
        cashierName: metadata.cashierName || 'Tuckshop Manager',
        items: cartItems.map(i => {
            const cur = metadata.currency || 'USD';
            const price = (cur === 'USD' ? i.price : (cur === 'ZAR' ? i.priceZAR : i.priceZiG));
            return { name: i.name, qty: i.qty, price: price };
        })
    };

    sales.push(sale);
    saveTenantData(DB_KEYS.SALES, sales);
    return sale; // Return the sale object for receipt generation
}

function getDailyStats() {
    seedData();
    const sales = getTenantData(DB_KEYS.SALES, '[]');
    const today = new Date().toISOString().split('T')[0];

    const todaySales = sales.filter(s => s.date.startsWith(today));
    const transactions = todaySales.length;

    const revenue = {
        USD: 0,
        ZiG: 0,
        ZAR: 0
    };

    todaySales.forEach(s => {
        const cur = s.currency || 'USD';
        if (revenue.hasOwnProperty(cur)) {
            revenue[cur] += s.total;
        } else {
            revenue.USD += s.total; // Fallback
        }
    });

    return { revenue, transactions };
}

function getLowStockItems() {
    const items = getInventory();
    return items.filter(i => i.stock <= i.threshold);
}

// Orders Operations
function getOrders() {
    seedData();
    return getTenantData(DB_KEYS.ORDERS, '[]');
}

function saveOrders(orders) {
    saveTenantData(DB_KEYS.ORDERS, orders);
}

function createOrder(supplier, items, date, note) {
    const orders = getOrders();
    const order = {
        id: 'PO-' + Date.now().toString().slice(-6),
        date: date || new Date().toISOString().split('T')[0],
        supplier,
        items,
        note,
        status: 'Pending'
    };
    orders.push(order);
    saveOrders(orders);
    showNotification('Order created successfully!');
}

function deleteOrder(id) {
    if (!confirm('Cancel this order?')) return;
    const orders = getOrders().filter(o => o.id !== id);
    saveOrders(orders);
    renderOrdersTable();
    showNotification('Order cancelled.');
}

// --- Page Specific Rendering ---

// Dashboard rendering
function renderDashboard() {
    const stats = getDailyStats();
    document.getElementById('dailyRevenue').innerHTML = `
        <div style="font-size: 0.8rem; opacity: 0.8;">USD: $${stats.revenue.USD.toFixed(2)}</div>
        <div style="font-size: 0.8rem; opacity: 0.8;">ZiG: ${stats.revenue.ZiG.toFixed(2)}</div>
        <div style="font-size: 0.8rem; opacity: 0.8;">ZAR: R${stats.revenue.ZAR.toFixed(2)}</div>
    `;
    document.getElementById('dailyTrans').textContent = stats.transactions;

    const lowStock = getLowStockItems();
    document.getElementById('lowStockCount').textContent = lowStock.length;

    const list = document.getElementById('lowStockList');
    if (list) {
        list.innerHTML = '';
        if (lowStock.length === 0) {
            list.innerHTML = '<div style="padding:15px; text-align:center; color:#888;">All stock levels healthy!</div>';
        } else {
            lowStock.forEach(item => {
                const div = document.createElement('div');
                div.className = 'list-item'; // Assume basic CSS
                div.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;';
                div.innerHTML = `
                    <div>
                        <div style="font-weight:600;">${item.name}</div>
                        <div style="font-size:0.8rem; color:#e74a3b;">Only ${item.stock} left</div>
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="window.location.href='tuckshop-orders.html'">Restock</button>
                `;
                list.appendChild(div);
            });
        }
    }
}

// Inventory Page rendering
function renderInventoryTable(filter = '') {
    const items = getInventory();
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const filtered = items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()) || i.category.toLowerCase().includes(filter.toLowerCase()));

    filtered.forEach(item => {
        let status = '<span class="badge bg-success">In Stock</span>';
        if (item.stock === 0) status = '<span class="badge bg-danger">Out of Stock</span>';
        else if (item.stock <= item.threshold) status = '<span class="badge bg-warning">Low Stock</span>';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>
                <div style="font-size:0.9rem;">$ ${item.price.toFixed(2)}</div>
                <div style="font-size:0.8rem; color:#1cc88a;">R ${item.priceZAR.toFixed(2)}</div>
                <div style="font-size:0.8rem; color:#f6c23e;">ZiG ${item.priceZiG.toFixed(2)}</div>
            </td>
            <td>${item.stock}</td>
            <td>${status}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editProduct('${item.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${item.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editProduct(id) {
    const items = getInventory();
    const item = items.find(i => i.id === id);
    if (item) {
        document.getElementById('editProdId').value = item.id;
        document.getElementById('editProdName').value = item.name;
        document.getElementById('editProdCat').value = item.category;
        document.getElementById('editProdPrice').value = item.price;
        document.getElementById('editProdPriceZAR').value = item.priceZAR || (item.price * 20); // Fallback if missing
        document.getElementById('editProdPriceZiG').value = item.priceZiG || (item.price * 30);
        document.getElementById('editProdStock').value = item.stock;
        document.getElementById('editProdThreshold').value = item.threshold || 5;
        openModal('editProductModal');
    }
}

function updateProduct(product) {
    const items = getInventory();
    const index = items.findIndex(i => i.id === product.id);
    if (index !== -1) {
        const oldItem = { ...items[index] };
        items[index] = { ...items[index], ...product };
        saveInventory(items);

        if (window.AuditLogger) {
            AuditLogger.log('Update Inventory Item', `Updated product: ${product.name} (ID: ${product.id})`, AuditLogger.SEVERITY.INFO, 'Ancillary', 'Tuckshop');
        }

        showNotification('Product updated: ' + product.name);
        return true;
    }
    return false;
}

let itemToDeleteId = null;

function deleteProduct(id) {
    const items = getInventory();
    const item = items.find(i => i.id === id);
    if (item) {
        itemToDeleteId = id;
        document.getElementById('deleteItemName').textContent = item.name;
        openModal('deleteConfirmModal');
    }
}

// Global listener for confirm delete
document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            if (itemToDeleteId) {
                const items = getInventory();
                const item = items.find(i => i.id === itemToDeleteId);
                const filtered = items.filter(i => i.id !== itemToDeleteId);
                saveInventory(filtered);

                if (window.AuditLogger && item) {
                    AuditLogger.log('Delete Inventory Item', `Deleted product: ${item.name} (${item.id})`, AuditLogger.SEVERITY.WARNING, 'Ancillary', 'Tuckshop');
                }

                renderInventoryTable();
                closeModal('deleteConfirmModal');
                showNotification('Item deleted');
                itemToDeleteId = null;
            }
        };
    }
});

function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const orders = getOrders();

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888; padding: 20px;">No orders found.</td></tr>';
        return;
    }

    orders.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${o.id}</td>
            <td><div style="font-weight:600;">${o.supplier}</div></td>
            <td><div style="font-size:0.9rem; color:#555;">${o.items}</div></td>
            <td>${o.date}</td>
            <td><span class="badge ${o.status === 'Pending' ? 'bg-warning' : 'bg-success'}">${o.status}</span></td>
            <td>
                 <button class="btn btn-sm btn-danger" onclick="deleteOrder('${o.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Sales / POS Page Logic
let currentCart = [];

function renderPOSGrid(filter = '') {
    const items = getInventory();
    const grid = document.getElementById('posGrid');
    if (!grid) return;

    grid.innerHTML = '';
    const filtered = items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()) && i.stock > 0);

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'glass-card product-card';
        card.style.cssText = 'padding: 15px; cursor: pointer; transition: transform 0.2s; text-align: center;';
        card.onclick = () => addToCart(item);
        card.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 3px;">${item.name}</div>
            <div style="font-size: 0.85rem; color: #4e73df; font-weight: 700; display: flex; flex-direction: column; gap: 2px;">
                <span>USD: ${formatCurrency(item.price, 'USD')}</span>
                <span style="color: #1cc88a;">ZAR: ${formatCurrency(item.priceZAR, 'ZAR')}</span>
                <span style="color: #f6c23e;">ZiG: ${formatCurrency(item.priceZiG, 'ZiG')}</span>
            </div>
            <div style="font-size: 0.8rem; color: #888; margin-top: 5px;">Stock: ${item.stock}</div>
        `;
        grid.appendChild(card);
    });
}

function addToCart(item) {
    const existing = currentCart.find(c => c.id === item.id);
    if (existing) {
        if (existing.qty < item.stock) {
            existing.qty++;
        } else {
            showNotification('Max stock reached for this item', 'error');
            return;
        }
    } else {
        currentCart.push({ ...item, qty: 1 });
    }
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartDiv = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const curSelect = document.getElementById('saleCurrency');
    if (!cartDiv || !totalEl) return;

    const currency = curSelect ? curSelect.value : 'USD';
    cartDiv.innerHTML = '';
    let total = 0;

    currentCart.forEach((item, index) => {
        const itemPrice = (currency === 'ZAR' ? item.priceZAR : (currency === 'ZiG' ? item.priceZiG : item.price));
        total += itemPrice * item.qty;

        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #eee;';
        itemDiv.innerHTML = `
            <div>
                <div style="font-weight: 500;">${item.name}</div>
                <div style="font-size: 0.85rem; color: #888;">${item.qty} x ${formatCurrency(itemPrice, currency)}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 600;">${formatCurrency(itemPrice * item.qty, currency)}</span>
                <i class="fas fa-times" style="color: #e74a3b; cursor: pointer;" onclick="removeFromCart(${index})"></i>
            </div>
        `;
        cartDiv.appendChild(itemDiv);
    });

    totalEl.textContent = formatCurrency(total, currency);
    calculateChange();
}

function calculateChange() {
    const totalEl = document.getElementById('cartTotal');
    const paidInput = document.getElementById('amountPaid');
    const changeEl = document.getElementById('changeGiven');
    const curSelect = document.getElementById('saleCurrency');

    if (!totalEl || !paidInput || !changeEl) return;

    const currency = curSelect ? curSelect.value : 'USD';
    const total = parseFloat(totalEl.textContent.replace(/[^0-9.]/g, '')) || 0;
    const paid = parseFloat(paidInput.value) || 0;
    const change = Math.max(0, paid - total);

    changeEl.textContent = formatCurrency(change, currency);
    if (paid < total && paid > 0) {
        changeEl.style.color = '#e74a3b';
    } else {
        changeEl.style.color = '#1cc88a';
    }
}

function removeFromCart(index) {
    currentCart.splice(index, 1);
    updateCartDisplay();
}

// --- POS Execution ---

async function completeSale() {
    if (currentCart.length === 0) {
        showNotification('Cart is empty', 'error');
        return;
    }

    const totalEl = document.getElementById('cartTotal');
    const paidInput = document.getElementById('amountPaid');
    const curSelect = document.getElementById('saleCurrency');
    const methodSelect = document.getElementById('saleMethod');
    const buyerInput = document.getElementById('buyerName');

    if (!totalEl || !paidInput) return;

    const total = parseFloat(totalEl.textContent.replace(/[^0-9.]/g, '')) || 0;
    const paid = parseFloat(paidInput.value) || 0;
    const method = methodSelect ? methodSelect.value : 'Cash';
    const currency = curSelect ? curSelect.value : 'USD';

    if (paid < total && method === 'Cash') {
        showNotification('Paid amount is less than total', 'error');
        return;
    }

    if (method === 'EcoCash') {
        const phone = document.getElementById('ecocashNumber');
        if (phone && !phone.value) {
            showNotification('Please enter EcoCash number', 'error');
            return;
        }
        await simulateEcoCash(phone ? phone.value : '');
    }

    const metadata = {
        currency: currency,
        paymentMethod: method,
        buyerName: buyerInput ? (buyerInput.value || 'Walk-in') : 'Walk-in',
        cashierName: JSON.parse(sessionStorage.getItem('ancillaryUser') || '{}').name || 'Tuckshop Manager',
        amountPaid: paid,
        changeGiven: Math.max(0, paid - total)
    };

    const sale = recordSale(currentCart, metadata);
    if (sale) {
        showNotification('Sale completed successfully!', 'success');

        // Show receipt if function exists (usually showReceipt)
        showReceipt(sale);

        currentCart = [];
        updateCartDisplay();
        renderPOSGrid();

        if (buyerInput) buyerInput.value = '';
        if (paidInput) paidInput.value = '';
        const changeEl = document.getElementById('changeGiven');
        if (changeEl) changeEl.textContent = formatCurrency(0, currency);

        const ecocashField = document.getElementById('ecocashField');
        if (ecocashField) ecocashField.style.display = 'none';

        const ecocashNumber = document.getElementById('ecocashNumber');
        if (ecocashNumber) ecocashNumber.value = '';

        if (methodSelect) methodSelect.value = 'Cash';
    }
}

function simulateEcoCash(phone) {
    return new Promise((resolve) => {
        const modal = document.getElementById('ecocashModal');
        const title = document.getElementById('ecocashStatusTitle');
        const msg = document.getElementById('ecocashStatusMsg');
        const icon = document.getElementById('ecocashStatusIcon');

        if (!modal || !title || !msg || !icon) {
            resolve();
            return;
        }

        modal.style.display = 'flex';

        // Phase 1: Sending prompt
        setTimeout(() => {
            title.textContent = 'PIN Prompt Sent';
            msg.innerHTML = `EcoCash prompt sent to <b>${phone}</b>.<br>Waiting for customer to enter PIN...`;
            icon.innerHTML = '<i class="fas fa-mobile-alt fa-shake"></i>';

            // Phase 2: Finalizing (Simulated approval)
            setTimeout(() => {
                title.textContent = 'Payment Authorized';
                title.style.color = '#28a745';
                msg.textContent = 'Transaction approved by customer.';
                icon.innerHTML = '<i class="fas fa-check-circle"></i>';
                icon.style.color = '#28a745';

                setTimeout(() => {
                    modal.style.display = 'none';
                    // Reset modal for next time
                    title.textContent = 'Processing EcoCash...';
                    title.style.color = '';
                    msg.textContent = 'Connecting to payment gateway...';
                    icon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    icon.style.color = '';
                    resolve();
                }, 1000);
            }, 3000);
        }, 1500);
    });
}

function showReceipt(sale) {
    const modal = document.getElementById('receiptModal');
    const content = document.getElementById('receiptContent');
    if (!modal || !content) return;

    const symbols = { 'USD': '$', 'ZAR': 'R', 'ZiG': '' };
    const suffixes = { 'ZiG': ' ZiG', 'USD': '', 'ZAR': '' };
    const currencySymbol = symbols[sale.currency] || '$';
    const currencySuffix = suffixes[sale.currency] || '';

    let itemsHtml = sale.items.map(i => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>${i.name} x${i.qty}</span>
            <span>${currencySymbol}${i.price.toFixed(2)}${currencySuffix}</span>
        </div>
    `).join('');

    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">EMBAKWE HIGH</h2>
            <p style="margin: 5px 0;">Official Tuckshop Receipt</p>
            <p style="font-size: 0.8rem; color: #888;">${new Date(sale.date).toLocaleString()}</p>
        </div>
        <div style="border-top: 1px dashed #333; border-bottom: 1px dashed #333; padding: 15px 0; margin-bottom: 20px;">
            ${itemsHtml}
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.2rem; margin-bottom: 15px;">
            <span>TOTAL</span>
            <span>${currencySymbol}${sale.total.toFixed(2)}${currencySuffix}</span>
        </div>
        <div style="font-size: 0.9rem; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span>Amount Paid</span>
                <span>${currencySymbol}${sale.amountPaid.toFixed(2)}${currencySuffix}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 600;">
                <span>Change Given</span>
                <span>${currencySymbol}${sale.changeGiven.toFixed(2)}${currencySuffix}</span>
            </div>
        </div>
        <div style="font-size: 0.8rem; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
            <p style="margin: 5px 0;">Method: ${sale.paymentMethod}</p>
            <p style="margin: 5px 0;">Buyer: ${sale.buyerName}</p>
            <p style="margin: 5px 0;">Cashier: ${sale.cashierName}</p>
        </div>
        <div style="text-align: center; margin-top: 30px; font-size: 0.8rem;">
            <p>Thank you for your purchase!</p>
            <p>Receipt ID: ${sale.id}</p>
        </div>
    `;
    modal.style.display = 'flex';
}

// Render Transaction History (for dashboard) with Pagination
let currentTransactionPage = 1;
const TRANSACTION_PAGE_SIZE = 5;

function renderTransactionHistory(page = 1) {
    const tbody = document.getElementById('transactionHistoryBody');
    if (!tbody) return;

    currentTransactionPage = page;
    seedData();
    const allSales = getTenantData(DB_KEYS.SALES, '[]').slice().reverse();

    if (allSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;padding:20px;">No transactions recorded yet.</td></tr>';
        renderPaginationControls(0);
        return;
    }

    const startIndex = (page - 1) * TRANSACTION_PAGE_SIZE;
    const paginatedSales = allSales.slice(startIndex, startIndex + TRANSACTION_PAGE_SIZE);

    tbody.innerHTML = '';
    paginatedSales.forEach(s => {
        const d = new Date(s.date);
        const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const itemsSummary = (s.items || []).map(i => `${i.name} x${i.qty}`).join(', ') || '—';
        const sym = s.currency === 'ZAR' ? 'R' : (s.currency === 'ZiG' ? 'ZiG ' : '$');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${s.id}</td>
            <td><div>${dateStr}</div><div style="font-size:0.75rem;color:#888;">${timeStr}</div></td>
            <td style="max-width:200px;font-size:0.82rem;">${itemsSummary}</td>
            <td style="font-weight:700;color:#10b981;">${sym}${parseFloat(s.total).toFixed(2)}</td>
            <td>${s.currency || 'USD'}</td>
            <td>${s.paymentMethod || 'Cash'}</td>
            <td>${s.buyerName || 'Walk-in'}</td>
        `;
        tbody.appendChild(tr);
    });

    renderPaginationControls(allSales.length);
}

function renderPaginationControls(totalItems) {
    const controls = document.getElementById('paginationControls');
    if (!controls) return;

    const totalPages = Math.ceil(totalItems / TRANSACTION_PAGE_SIZE);
    if (totalPages <= 1) {
        controls.innerHTML = '';
        return;
    }

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0;">
            <div style="font-size: 0.85rem; color: #666;">
                Showing ${((currentTransactionPage - 1) * TRANSACTION_PAGE_SIZE) + 1} to ${Math.min(currentTransactionPage * TRANSACTION_PAGE_SIZE, totalItems)} of ${totalItems} entries
            </div>
            <div style="display: flex; gap: 5px;">
                <button onclick="renderTransactionHistory(${currentTransactionPage - 1})" ${currentTransactionPage === 1 ? 'disabled' : ''} 
                    style="padding: 5px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: ${currentTransactionPage === 1 ? 'not-allowed' : 'pointer'}; opacity: ${currentTransactionPage === 1 ? '0.5' : '1'};">
                    Previous
                </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button onclick="renderTransactionHistory(${i})" 
                style="padding: 5px 12px; border: 1px solid ${currentTransactionPage === i ? '#0056b3' : '#ddd'}; border-radius: 4px; background: ${currentTransactionPage === i ? '#0056b3' : 'white'}; color: ${currentTransactionPage === i ? 'white' : '#333'}; cursor: pointer;">
                ${i}
            </button>
        `;
    }

    html += `
                <button onclick="renderTransactionHistory(${currentTransactionPage + 1})" ${currentTransactionPage === totalPages ? 'disabled' : ''} 
                    style="padding: 5px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: ${currentTransactionPage === totalPages ? 'not-allowed' : 'pointer'}; opacity: ${currentTransactionPage === totalPages ? '0.5' : '1'};">
                    Next
                </button>
            </div>
        </div>
    `;
    controls.innerHTML = html;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    seedData();
    const path = window.location.href;
    if (path.includes('dashboard')) {
        renderDashboard();
        renderTransactionHistory();
    }
    if (path.includes('inventory')) {
        updateCategoryDropdowns();
        renderInventoryTable();
        const invSearch = document.getElementById('invSearch');
        if (invSearch) invSearch.addEventListener('keyup', (e) => renderInventoryTable(e.target.value));

        const addProductForm = document.getElementById('addProductForm');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const product = {
                    name: document.getElementById('prodName').value,
                    category: document.getElementById('prodCat').value,
                    price: parseFloat(document.getElementById('prodPrice').value),
                    priceZAR: parseFloat(document.getElementById('prodPriceZAR').value),
                    priceZiG: parseFloat(document.getElementById('prodPriceZiG').value),
                    stock: parseInt(document.getElementById('prodStock').value),
                    threshold: 5
                };
                addProduct(product);
                closeModal('addProductModal');
                renderInventoryTable();
                e.target.reset();
            });
        }

        const editProductForm = document.getElementById('editProductForm');
        if (editProductForm) {
            editProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const product = {
                    id: document.getElementById('editProdId').value,
                    name: document.getElementById('editProdName').value,
                    category: document.getElementById('editProdCat').value,
                    price: parseFloat(document.getElementById('editProdPrice').value),
                    priceZAR: parseFloat(document.getElementById('editProdPriceZAR').value),
                    priceZiG: parseFloat(document.getElementById('editProdPriceZiG').value),
                    stock: parseInt(document.getElementById('editProdStock').value),
                    threshold: parseInt(document.getElementById('editProdThreshold').value)
                };
                if (updateProduct(product)) {
                    closeModal('editProductModal');
                    renderInventoryTable();
                }
            });
        }

        const addCatForm = document.getElementById('addCategoryForm');
        if (addCatForm) {
            addCatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('newCategoryName').value;
                const targetId = document.getElementById('targetSelectId').value;
                addNewCategory(name, targetId);
                e.target.reset();
            });
        }
    }
    if (path.includes('sales')) {
        renderPOSGrid();
        const posSearch = document.getElementById('posSearch');
        if (posSearch) posSearch.addEventListener('keyup', (e) => renderPOSGrid(e.target.value));

        const curSelect = document.getElementById('saleCurrency');
        if (curSelect) curSelect.addEventListener('change', updateCartDisplay);

        const paidInput = document.getElementById('amountPaid');
        if (paidInput) paidInput.addEventListener('input', calculateChange);

        const methodSelect = document.getElementById('saleMethod');
        if (methodSelect) {
            methodSelect.addEventListener('change', function () {
                const ecocashField = document.getElementById('ecocashField');
                if (ecocashField) ecocashField.style.display = this.value === 'EcoCash' ? 'block' : 'none';
            });
        }
    }
    // Note: Orders page handles its own DOMContentLoaded event inline
});


