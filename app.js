/**
 * OREO E-Commerce — Cart, toasts, dunk meter, and silly fun
 */

const products = [
  { id: "1", name: "Classic", price: 4.99 },
  { id: "2", name: "Golden", price: 4.99 },
  { id: "3", name: "Double Stuf", price: 5.49 },
  { id: "4", name: "Mint", price: 5.49 },
  { id: "5", name: "Peanut Butter", price: 5.49 },
  { id: "6", name: "Mega Stuf", price: 5.99 },
];

const toastMessages = [
  "Cookie acquired. Milk is pleased.",
  "Added! Your future self will thank you.",
  "One more pack. No one's counting.",
  "Twist. Lick. Dunk. Repeat. You're ready.",
  "Your cart is now 100% more delicious.",
  "Dunk level: rising.",
  "Cookie stash: updated.",
  "We won't tell your dentist.",
];

let cart = [];

const cartDrawer = document.getElementById("cart-drawer");
const cartOverlay = document.getElementById("cart-overlay");
const cartTrigger = document.getElementById("cart-trigger");
const cartClose = document.getElementById("cart-close");
const cartCount = document.getElementById("cart-count");
const cartItems = document.getElementById("cart-items");
const cartEmpty = document.getElementById("cart-empty");
const cartTotalEl = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const toast = document.getElementById("toast");
const toastMsg = toast?.querySelector(".toast-msg");
const dunkBar = document.getElementById("dunk-bar");
const dunkSection = document.querySelector(".dunk-section");

function getCartTotalItems() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function getCartTotalPrice() {
  return cart.reduce((sum, item) => {
    const p = products.find((pr) => pr.id === item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

function updateCartUI() {
  const totalItems = getCartTotalItems();
  cartCount.textContent = totalItems;
  cartCount.style.animation = "none";
  cartCount.offsetHeight; // reflow
  cartCount.style.animation = "pop 0.4s ease";

  cartTotalEl.textContent = `$${getCartTotalPrice().toFixed(2)}`;
  checkoutBtn.disabled = totalItems === 0;

  if (totalItems === 0) {
    cartEmpty.style.display = "block";
    cartItems.querySelectorAll(".cart-item").forEach((el) => el.remove());
    return;
  }

  cartEmpty.style.display = "none";
  cartItems.querySelectorAll(".cart-item").forEach((el) => el.remove());

  cart.forEach((item) => {
    const p = products.find((pr) => pr.id === item.id);
    if (!p) return;
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <span class="cart-item-name">${p.name}</span>
      <span class="cart-item-qty">×${item.qty}</span>
      <span class="cart-item-price">$${(p.price * item.qty).toFixed(2)}</span>
    `;
    cartItems.insertBefore(div, cartEmpty);
  });
}

function showToast() {
  const msg = toastMessages[Math.floor(Math.random() * toastMessages.length)];
  if (toastMsg) toastMsg.textContent = msg;
  toast.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function addToCart(productId) {
  const p = products.find((pr) => pr.id === String(productId));
  if (!p) return;

  const existing = cart.find((c) => c.id === String(productId));
  if (existing) existing.qty += 1;
  else cart.push({ id: String(productId), qty: 1 });

  updateCartUI();
  showToast();
}

function openCart() {
  cartDrawer.setAttribute("aria-hidden", "false");
  cartOverlay.setAttribute("aria-hidden", "false");
  cartDrawer.classList.add("open");
  cartOverlay.classList.add("open");
}

function closeCart() {
  cartDrawer.setAttribute("aria-hidden", "true");
  cartOverlay.setAttribute("aria-hidden", "true");
  cartDrawer.classList.remove("open");
  cartOverlay.classList.remove("open");
}

// Add to cart buttons
document.querySelectorAll(".add-cart").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-id");
    addToCart(id);
    btn.classList.add("added");
    setTimeout(() => btn.classList.remove("added"), 500);
  });
});

// Cart open/close
if (cartTrigger) cartTrigger.addEventListener("click", openCart);
if (cartClose) cartClose.addEventListener("click", closeCart);
if (cartOverlay) cartOverlay.addEventListener("click", closeCart);

// Dunk meter: mouse move across section
if (dunkSection && dunkBar) {
  dunkSection.addEventListener("mousemove", (e) => {
    const rect = dunkSection.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    dunkBar.style.width = `${pct}%`;
  });
  dunkSection.addEventListener("mouseleave", () => {
    dunkBar.style.width = "25%";
  });
}

// Hero Oreo click twist
const heroOreo = document.getElementById("hero-oreo");
if (heroOreo) {
  heroOreo.addEventListener("click", () => {
    heroOreo.style.animation = "none";
    heroOreo.offsetHeight;
    heroOreo.style.animation = "twist 0.6s ease forwards";
    setTimeout(() => {
      heroOreo.style.animation = "gentleSpin 8s ease-in-out infinite";
    }, 600);
  });
}

// Checkout button (funny alert for demo)
if (checkoutBtn) {
  checkoutBtn.addEventListener("click", () => {
    if (getCartTotalItems() === 0) return;
    alert("Thanks for pretending to buy! 🍪 In a real site this would open checkout. Now go dunk those cookies.");
  });
}

updateCartUI();
