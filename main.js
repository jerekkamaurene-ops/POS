// Main JS moved from POS.html with role-based login and tendered amount handling

// --- STATE ---
let cart = [];
let editProductIndex = null;

// --- STORAGE KEYS ---
const SK_PRODUCTS = 'vapeshop-products';
const SK_SALES = 'vapeshop-sales';
const SK_USER = 'vapeshop-user';
const SK_USER_ROLE = 'vapeshop-user-role';

// --- USERS (demo) ---
const USERS = [
  { username: 'glydel', password: 'tubis', role: 'admin' },
  { username: 'maurene', password: 'mendrez', role: 'cashier' }
];

// --- UTILITIES ---
function saveProducts(products) {
  localStorage.setItem(SK_PRODUCTS, JSON.stringify(products));
}
function getProducts() {
  return JSON.parse(localStorage.getItem(SK_PRODUCTS) || '[]');
}
function saveSales(sales) {
  localStorage.setItem(SK_SALES, JSON.stringify(sales));
}
function getSales() {
  return JSON.parse(localStorage.getItem(SK_SALES) || '[]');
}

// --- LOGIN LOGIC ---
function login() {
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  const role = document.getElementById('login-role').value;
  const errorEl = document.getElementById('login-error');
  errorEl.innerText = '';
  const user = USERS.find(x => x.username === u && x.password === p && x.role === role);
  if (user) {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('main-container').classList.remove('hidden');
    showTab('pos');
    localStorage.setItem(SK_USER, u);
    localStorage.setItem(SK_USER_ROLE, role);
    applyRolePermissions(role);
  } else {
    errorEl.innerText = 'Invalid username, password, or role.';
  }
}
function logout() {
  document.getElementById('login-container').classList.remove('hidden');
  document.getElementById('main-container').classList.add('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  cart = [];
  renderCart();
  localStorage.removeItem(SK_USER);
  localStorage.removeItem(SK_USER_ROLE);
}

function applyRolePermissions(role) {
  // Hide products tab for non-admins
  const productsBtn = document.getElementById('products-tab-btn');
  if (!productsBtn) return;
  if (role !== 'admin') {
    productsBtn.style.display = 'none';
    // if currently on products tab, switch to pos
    if (!document.getElementById('tab-products').classList.contains('hidden')) showTab('pos');
  } else {
    productsBtn.style.display = '';
  }
  // Show sales date filter only for admin
  const salesFilter = document.getElementById('sales-filter');
  if (salesFilter) {
    salesFilter.classList.toggle('hidden', role !== 'admin');
  }
}

// --- TABS LOGIC ---
function showTab(tab) {
  let tabs = ['pos','products','sales'];
  for (const t of tabs) {
    const el = document.getElementById('tab-'+t);
    if (el) el.classList.add('hidden');
  }
  const tabEl = document.getElementById('tab-'+tab);
  if (tabEl) tabEl.classList.remove('hidden');
  let btns = document.querySelectorAll('.tabs button');
  btns.forEach((b, i) => b.classList.toggle('active', tabs[i] === tab));
  if (tab === 'products') renderProducts();
  if (tab === 'sales') renderSales();
  if (tab === 'pos') {
    renderCart();
    const bc = document.getElementById('barcode'); if (bc) bc.focus();
  }
}

// --- PRODUCTS LOGIC ---
function renderProducts() {
  let products = getProducts();
  let tbody = document.getElementById('products-body');
  tbody.innerHTML = '';
  products.forEach((prod, i) => {
    let tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${prod.barcode}</td>
      <td>${prod.name}</td>
      <td>₱${(+prod.price).toFixed(2)}</td>
      <td>${prod.stock}</td>
      <td>
        <button class="mini-btn" onclick="editProduct(${i})">Edit</button>
        <button class="mini-btn" onclick="deleteProduct(${i})">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
}
function saveProduct() {
  let barcode = document.getElementById('p-barcode').value.trim();
  let name = document.getElementById('p-name').value.trim();
  let price = parseFloat(document.getElementById('p-price').value);
  let stock = parseInt(document.getElementById('p-stock').value, 10);
  let error = document.getElementById('prod-error');
  let success = document.getElementById('prod-success');
  error.innerText = ''; success.innerText = '';
  if (!barcode || !name || isNaN(price) || price<0 || isNaN(stock) || stock<0) {
    error.innerText = "Please fill all fields with valid values.";
    return;
  }
  let products = getProducts();
  if (editProductIndex !== null) {
    if (products.some((p, i) => p.barcode===barcode && i!==editProductIndex)) {
      error.innerText = "Barcode already exists.";
      return;
    }
    products[editProductIndex] = { barcode, name, price, stock };
    saveProducts(products);
    success.innerText = "Product updated!";
    clearProductForm();
    renderProducts();
    return;
  }
  if (products.some(p => p.barcode === barcode)) {
    error.innerText = "Barcode already exists.";
    return;
  }
  products.push({ barcode, name, price, stock });
  saveProducts(products);
  success.innerText = "Product added!";
  clearProductForm();
  renderProducts();
}
function editProduct(idx) {
  let products = getProducts();
  let p = products[idx];
  document.getElementById('p-barcode').value = p.barcode;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-stock').value = p.stock;
  document.getElementById('p-edit-index').value = idx;
  document.getElementById('product-save-btn').innerText = "Update Product";
  editProductIndex = idx;
}
function deleteProduct(idx) {
  if (!confirm("Delete this product?")) return;
  let products = getProducts();
  products.splice(idx, 1);
  saveProducts(products);
  renderProducts();
}
function clearProductForm() {
  document.getElementById('p-barcode').value = '';
  document.getElementById('p-name').value = '';
  document.getElementById('p-price').value = '';
  document.getElementById('p-stock').value = '';
  document.getElementById('p-edit-index').value = '';
  document.getElementById('prod-error').innerText = '';
  document.getElementById('prod-success').innerText = '';
  document.getElementById('product-save-btn').innerText = "Add Product";
  editProductIndex = null;
}

// --- POS/CART LOGIC ---
function addProductToCart() {
  let barcode = document.getElementById('barcode').value.trim();
  let qty = parseInt(document.getElementById('cart-qty').value, 10) || 1;
  let discount = parseFloat(document.getElementById('item-discount').value) || 0;
  let error = document.getElementById('pos-error');
  error.innerText = '';
  if (!barcode) { error.innerText = "Barcode required."; return; }
  let products = getProducts();
  let prod = products.find(p => p.barcode === barcode);
  if (!prod) { error.innerText = "Product not found."; return; }
  if (prod.stock < qty) { error.innerText = "Insufficient stock."; return;}
  if (qty < 1) { error.innerText = "Quantity must be positive."; return;}
  if (discount<0 || discount>100) { error.innerText = "Discount must be 0-100%"; return; }
  let idx = cart.findIndex(item => item.barcode === barcode);
  if (idx >= 0) {
    if (prod.stock < cart[idx].qty + qty) {
      error.innerText = "Insufficient stock.";
      return;
    }
    cart[idx].qty += qty;
    cart[idx].discount = discount;
  } else {
    cart.push({ barcode, name: prod.name, price: prod.price, qty, discount });
  }
  document.getElementById('barcode').value = '';
  document.getElementById('cart-qty').value = 1;
  document.getElementById('item-discount').value = 0;
  renderCart();
  document.getElementById('barcode').focus();
}
function renderCart() {
  let tbody = document.getElementById('cart-body');
  tbody.innerHTML = '';
  let total = 0, totalDiscount = 0;
  cart.forEach((item, i) => {
    let subtotal = item.price * item.qty;
    let itemDisc = subtotal * (item.discount||0) / 100;
    totalDiscount += itemDisc;
    let afterDisc = subtotal - itemDisc;
    total += afterDisc;
    let tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.barcode}</td>
      <td>${item.name}</td>
      <td>₱${(+item.price).toFixed(2)}</td>
      <td>
        <input type="number" value="${item.qty}" min="1" max="999" style="width:48px;" onchange="updateCartQty(${i}, this.value)">
      </td>
      <td>
        <input type="number" value="${item.discount||0}" min="0" max="100" style="width:48px;" onchange="updateCartDiscount(${i}, this.value)">
      </td>
      <td>₱${afterDisc.toFixed(2)}</td>
      <td class="actions"><button onclick="removeCartItem(${i})">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });
  let cartDiscPct = parseFloat(document.getElementById('cart-discount').value) || 0;
  let cartDisc = total * cartDiscPct / 100;
  document.getElementById('cart-total-discount').innerText = '₱' + totalDiscount.toFixed(2);
  document.getElementById('cart-total').innerText = '₱' + (total - cartDisc).toFixed(2);
}
function updateCartQty(idx, val) {
  let qty = parseInt(val,10)||1;
  let products = getProducts();
  let prod = products.find(p => p.barcode === cart[idx].barcode);
  if (!prod) return;
  if (qty < 1) qty = 1;
  if (qty > prod.stock) qty = prod.stock;
  cart[idx].qty = qty;
  renderCart();
}
function updateCartDiscount(idx, val) {
  let disc = parseFloat(val)||0;
  if (disc<0) disc=0;
  if (disc>100) disc=100;
  cart[idx].discount = disc;
  renderCart();
}
function removeCartItem(idx) {
  cart.splice(idx, 1);
  renderCart();
}

// --- CHECKOUT LOGIC (uses 'tendered-amount' input) ---
function checkout() {
  if (cart.length === 0) {
    document.getElementById('checkout-success').innerText = '';
    alert("Cart is empty!");
    return;
  }
  let products = getProducts();
  let saleItems = [];
  let error = '';
  for (const item of cart) {
    let prod = products.find(p => p.barcode === item.barcode);
    if (!prod || prod.stock < item.qty) {
      error = "Insufficient stock for " + item.name;
      break;
    }
  }
  if (error) { alert(error); return;}
  cart.forEach(item => {
    let prod = products.find(p => p.barcode === item.barcode);
    if (prod) prod.stock -= item.qty;
    saleItems.push({...item});
  });
  saveProducts(products);
  let cartDiscPct = parseFloat(document.getElementById('cart-discount').value) || 0;
  let total = saleItems.reduce((sum, item) => {
    let sub = item.price * item.qty;
    let disc = sub * (item.discount||0) / 100;
    return sum + (sub - disc);
  }, 0);
  let cartDiscount = total * cartDiscPct / 100;
  let finalTotal = +(total - cartDiscount).toFixed(2);

  // Read tendered amount from input
  let tendered = parseFloat(document.getElementById('tendered-amount').value) || 0;
  if (tendered < finalTotal) {
    alert('Insufficient cash. Enter amount tendered that is at least the total.');
    return;
  }
  let change = +(tendered - finalTotal).toFixed(2);

  let sale = {
    datetime: new Date().toISOString(),
    items: saleItems,
    cartDiscount: cartDiscPct,
    total: finalTotal,
    tendered: tendered,
    change: change
  };
  let sales = getSales();
  sales.push(sale);
  saveSales(sales);
  showReceipt(sale);
  cart = [];
  renderCart();
  document.getElementById('checkout-success').innerText = "Checkout successful!";
  setTimeout(()=>{ document.getElementById('checkout-success').innerText = ""; }, 2000);
  document.getElementById('tendered-amount').value = '';
}

// --- RECEIPT LOGIC ---
function showReceipt(sale) {
  let html = `<h3>VapeShop POS Receipt</h3>
    <div>Date/Time: ${new Date(sale.datetime).toLocaleString()}</div>
    <hr>
    <table style="width:100%;font-size:14px;">
      <tr>
        <th>Name</th><th>Qty</th><th>Price</th><th>Disc%</th><th>Total</th>
      </tr>
      ${sale.items.map(item => {
        let sub = item.price*item.qty;
        let disc = sub*(item.discount||0)/100;
        let afterDisc = sub-disc;
        return `<tr>
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>₱${item.price.toFixed(2)}</td>
          <td>${item.discount||0}</td>
          <td>₱${afterDisc.toFixed(2)}</td>
        </tr>`;
      }).join('')}
    </table>
    <hr>
    <div class="total">Cart Discount: ${sale.cartDiscount||0}%</div>
    <div class="total">Total: <b>₱${(+sale.total).toFixed(2)}</b></div>
    <div class="total">Tendered: ₱${(+sale.tendered).toFixed(2)}</div>
    <div class="total">Change: ₱${(+sale.change).toFixed(2)}</div>
    <hr>
    <div class="center">Thank you!</div>
  `;
  document.getElementById('receipt-content').innerHTML = html;
  document.getElementById('receipt-modal').classList.remove('hidden');
}
function closeReceipt() {
  document.getElementById('receipt-modal').classList.add('hidden');
}
function printReceipt() {
  const content = document.getElementById('receipt-content').innerHTML;
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title></head><body style="background:#181926;color:#e2dfec;font-family:Montserrat,Arial,sans-serif;">${content}</body></html>`;
  let win = window.open('', '', 'width=400,height=600');
  if (!win) return alert('Popup blocked. Allow popups to print.');
  win.document.open();
  win.document.write(doc);
  win.document.close();
  win.print();
  win.close();
}

// --- SALES HISTORY ---
function renderSales() {
  let tbody = document.getElementById('sales-body');
  let sales = getSales();
  tbody.innerHTML = '';
  // Read optional filter values (if present)
  const startVal = document.getElementById('sales-start') ? document.getElementById('sales-start').value : '';
  const endVal = document.getElementById('sales-end') ? document.getElementById('sales-end').value : '';
  let filtered = sales.map((s, idx) => ({ sale: s, idx }));
  if (startVal) {
    const sd = new Date(startVal + 'T00:00:00');
    filtered = filtered.filter(o => new Date(o.sale.datetime) >= sd);
  }
  if (endVal) {
    const ed = new Date(endVal + 'T23:59:59');
    filtered = filtered.filter(o => new Date(o.sale.datetime) <= ed);
  }
  filtered.forEach(({ sale, idx }) => {
    let itemsStr = sale.items.map(it => `${it.name} x${it.qty}`).join('<br>');
    let tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(sale.datetime).toLocaleString()}</td>
      <td>${itemsStr}</td>
      <td>₱${(+sale.total).toFixed(2)}</td>
      <td><button onclick="showReceiptByIndex(${idx})">View</button></td>
    `;
    tbody.appendChild(tr);
  });
}
// Filter helpers
function filterSales() {
  renderSales();
}
function clearSalesFilter() {
  const s = document.getElementById('sales-start');
  const e = document.getElementById('sales-end');
  if (s) s.value = '';
  if (e) e.value = '';
  renderSales();
}
function showReceiptByIndex(idx) {
  let sales = getSales();
  showReceipt(sales[idx]);
}
function exportSalesCSV() {
  let sales = getSales();
  let rows = [['Date/Time','Items','Cart Discount','Total']];
  sales.forEach(sale=>{
    let itemsStr = sale.items.map(it=>`${it.name} x${it.qty} @₱${it.price} (${it.discount||0}%)`).join('; ');
    rows.push([
      new Date(sale.datetime).toLocaleString(),
      itemsStr,
      sale.cartDiscount||0,
      sale.total
    ]);
  });
  let csv = rows.map(r=>r.map(cell=>(String(cell).replace(/"/g,'""'))).join(',')).join('\n');
  let blob = new Blob([csv], {type:'text/csv'});
  let url = URL.createObjectURL(blob);
  let a = document.getElementById('csv-dl');
  a.href = url;
  a.download = 'sales.csv';
  a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
}

// --- BARCODE SCANNER SUPPORT ---
document.addEventListener('DOMContentLoaded', () => {
  const barcodeEl = document.getElementById('barcode');
  if (barcodeEl) {
    barcodeEl.addEventListener('keydown', function(e){
      if (e.key === 'Enter') {
        e.preventDefault();
        addProductToCart();
      }
    });
  }

  // Auto-login check
  if (!localStorage.getItem(SK_PRODUCTS)) {
    saveProducts([
      { barcode: '10010001', name: 'Vape Juice - Grape', price: 250, stock: 30 },
      { barcode: '10010002', name: 'Vape Juice - Mint', price: 260, stock: 25 },
      { barcode: '10010003', name: 'Disposable Vape', price: 400, stock: 15 },
      { barcode: '10010004', name: 'Vape Coil', price: 110, stock: 40 },
      { barcode: '10010005', name: 'Vape Mod Kit', price: 1800, stock: 5 },
      { barcode: '4803925120213',name: 'Ahtdog', price: 6969, stock:69}
    ]);
  }
  let user = localStorage.getItem(SK_USER);
  let role = localStorage.getItem(SK_USER_ROLE);
  if (user && role) {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('main-container').classList.remove('hidden');
    applyRolePermissions(role);
    showTab('pos');
  }
  renderProducts();
  renderCart();
});