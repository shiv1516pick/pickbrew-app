var PickBrew = (function () {
  function load(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  }
  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function getCart() {
    return load("pb_cart");
  }
  function saveCart(cart) {
    save("pb_cart", cart);
    updateBadge();
  }
  function addToCart(item) {
    var cart = getCart();
    var existing = cart.find(function (c) {
      return (
        c.id === item.id &&
        c.size === item.size &&
        c.strength === item.strength &&
        c.flavor === item.flavor &&
        JSON.stringify(c.addons) === JSON.stringify(item.addons)
      );
    });
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      item.qty = item.qty || 1;
      cart.push(item);
    }
    saveCart(cart);
    return cart;
  }
  function removeFromCart(index) {
    var cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    return cart;
  }
  function updateQty(index, delta) {
    var cart = getCart();
    if (!cart[index]) return cart;
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
    saveCart(cart);
    return cart;
  }
  function getCartCount() {
    var cart = getCart();
    var count = 0;
    cart.forEach(function (c) {
      count += c.qty;
    });
    return count;
  }
  function getCartTotal() {
    var cart = getCart();
    var total = 0;
    cart.forEach(function (c) {
      total += c.price * c.qty;
    });
    return total;
  }

  // ---- favorites ----
  function getFavorites() {
    return load("pb_favs");
  }
  function saveFavorites(favs) {
    save("pb_favs", favs);
  }
  function toggleFavorite(item) {
    var favs = getFavorites();
    var idx = favs.findIndex(function (f) {
      return f.id === item.id;
    });
    if (idx > -1) {
      favs.splice(idx, 1);
    } else {
      favs.push(item);
    }
    saveFavorites(favs);
    return favs;
  }
  function isFavorite(id) {
    var favs = getFavorites();
    return favs.some(function (f) {
      return f.id === id;
    });
  }
  function removeFavorite(id) {
    var favs = getFavorites();
    favs = favs.filter(function (f) {
      return f.id !== id;
    });
    saveFavorites(favs);
    return favs;
  }

  // ---- menu quick-add helpers ----
  function getCartQtyById(id) {
    var cart = getCart();
    var total = 0;
    cart.forEach(function (c) {
      if (c.id === id) total += c.qty;
    });
    return total;
  }
  function quickAdd(id, name, price, image, desc) {
    var cart = getCart();
    var existing = cart.find(function (c) {
      return c.id === id && c.size === "Regular" && c.strength === "Regular" && c.flavor === "None" && c.addons.length === 0;
    });
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: id, name: name, price: price, image: image, desc: desc, size: "Regular", strength: "Regular", flavor: "None", addons: [], note: "", qty: 1 });
    }
    saveCart(cart);
    return getCartQtyById(id);
  }
  function quickRemove(id) {
    var cart = getCart();
    // find the default-options entry first
    var idx = -1;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id && cart[i].size === "Regular" && cart[i].strength === "Regular" && cart[i].flavor === "None" && cart[i].addons.length === 0) {
        idx = i;
        break;
      }
    }
    // fallback: find any entry with this id
    if (idx === -1) {
      for (var j = 0; j < cart.length; j++) {
        if (cart[j].id === id) { idx = j; break; }
      }
    }
    if (idx > -1) {
      cart[idx].qty -= 1;
      if (cart[idx].qty <= 0) cart.splice(idx, 1);
      saveCart(cart);
    }
    return getCartQtyById(id);
  }

  // ---- orders ----
  function getOrders() {
    return load("pb_orders");
  }
  function saveOrder(orderItems, total) {
    var orders = getOrders();
    orders.unshift({
      id: "ORD-" + Date.now(),
      date: new Date().toISOString(),
      items: orderItems,
      total: total
    });
    save("pb_orders", orders);
    return orders;
  }

  // ---- user / auth ----
  function getUser() {
    try { return JSON.parse(localStorage.getItem("pb_user")) || null; } catch (e) { return null; }
  }
  function saveUser(user) {
    localStorage.setItem("pb_user", JSON.stringify(user));
  }
  function logout() {
    localStorage.removeItem("pb_user");
  }
  function isLoggedIn() {
    return !!getUser();
  }
  function getPref(key) {
    try { var p = JSON.parse(localStorage.getItem("pb_prefs")) || {}; return p[key]; } catch (e) { return undefined; }
  }
  function setPref(key, val) {
    try { var p = JSON.parse(localStorage.getItem("pb_prefs")) || {}; p[key] = val; localStorage.setItem("pb_prefs", JSON.stringify(p)); } catch (e) { /* noop */ }
  }

  // ---- badge ----
  function updateBadge() {
    var count = getCartCount();
    var badges = document.querySelectorAll(".cart-badge");
    badges.forEach(function (b) {
      if (count > 0) {
        b.textContent = count;
        b.style.display = "";
      } else {
        b.style.display = "none";
      }
    });
  }

  // ---- toast ----
  function showToast(message) {
    var existing = document.getElementById("pb-toast");
    if (existing) existing.remove();
    var toast = document.createElement("div");
    toast.id = "pb-toast";
    toast.textContent = message;
    toast.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#af7b5c;color:#000;padding:8px 20px;border-radius:20px;font-size:14px;font-weight:600;z-index:999;transition:opacity .3s;";
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = "0";
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 1500);
  }

  // ---- init ----
  document.addEventListener("DOMContentLoaded", function () {
    updateBadge();
  });

  return {
    getCart: getCart,
    addToCart: addToCart,
    removeFromCart: removeFromCart,
    updateQty: updateQty,
    getCartCount: getCartCount,
    getCartTotal: getCartTotal,
    getFavorites: getFavorites,
    toggleFavorite: toggleFavorite,
    isFavorite: isFavorite,
    removeFavorite: removeFavorite,
    getCartQtyById: getCartQtyById,
    quickAdd: quickAdd,
    quickRemove: quickRemove,
    getOrders: getOrders,
    saveOrder: saveOrder,
    getUser: getUser,
    saveUser: saveUser,
    logout: logout,
    isLoggedIn: isLoggedIn,
    getPref: getPref,
    setPref: setPref,
    updateBadge: updateBadge,
    showToast: showToast,
  };
})();
