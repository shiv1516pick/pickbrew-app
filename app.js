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
        (c.size || "Medium") === (item.size || "Medium") &&
        (c.strength || "Regular") === (item.strength || "Regular") &&
        (c.flavor || "None") === (item.flavor || "None") &&
        JSON.stringify(c.addons || []) === JSON.stringify(item.addons || [])
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
      return c.id === id && c.size === "Medium" && c.strength === "Regular" && c.flavor === "None" && c.addons.length === 0;
    });
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: id, name: name, price: price, image: image, desc: desc, size: "Medium", strength: "Regular", flavor: "None", addons: [], note: "", qty: 1 });
    }
    saveCart(cart);
    return getCartQtyById(id);
  }
  function quickRemove(id) {
    var cart = getCart();
    var idx = -1;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === id && cart[i].size === "Medium" && cart[i].strength === "Regular" && cart[i].flavor === "None" && cart[i].addons.length === 0) {
        idx = i;
        break;
      }
    }
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
    localStorage.setItem("pb_session", "1");
  }
  function logout() {
    localStorage.removeItem("pb_session");
  }
  function isLoggedIn() {
    return !!getUser() && localStorage.getItem("pb_session") === "1";
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

  // ---- catalog data (shared source of truth) ----
  var CATEGORIES = [
    { id: "breakfast", name: "Breakfast", isFood: true, desc: "Burritos, oats & acai bowls" },
    { id: "coffee", name: "Coffee", desc: "Brewed, cold brew & pour over" },
    { id: "coffee-classics", name: "Coffee Classics", desc: "Lattes, mochas & flat whites" },
    { id: "drip", name: "Drip", desc: "House, bold & blonde roasts" },
    { id: "espresso", name: "Espresso", desc: "Shots, americano & ristretto" },
    { id: "espresso-drinks", name: "Espresso Drinks", desc: "Cappuccinos, mochas & more" },
    { id: "food", name: "Food", isFood: true, desc: "Bagels, pastries & snacks" },
    { id: "hot-coffee-tea", name: "Hot Coffee & Tea", desc: "Chai, matcha & hot chocolate" },
    { id: "hot-drinks", name: "Hot Drinks", desc: "Steamers, cider & London fog" },
    { id: "iced-drinks", name: "Iced Drinks", desc: "Iced lattes, matcha & chai" },
    { id: "lattes", name: "Lattes", desc: "Vanilla, pumpkin & lavender" },
    { id: "seasonal", name: "Seasonal Menu", desc: "Limited time holiday drinks" },
    { id: "tea-lattes", name: "Tea Lattes", desc: "Chai, matcha & London fog" },
    { id: "teas", name: "Teas", desc: "Green, chamomile & earl grey" }
  ];

  var PRODUCTS = [
    // ── Breakfast ──
    { id: "breakfast-burrito", name: "Breakfast Burrito", price: 6.99, image: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f", desc: "Scrambled eggs, cheese, salsa & beans", prep: "8-12 min", category: "breakfast", tag: "Flour Tortilla" },
    { id: "egg-cheese-sandwich", name: "Egg & Cheese Sandwich", price: 5.49, image: "https://images.unsplash.com/photo-1525351484163-7529414344d8", desc: "Fried egg with melted cheese on brioche", prep: "6-10 min", category: "breakfast", tag: "On Brioche" },
    { id: "overnight-oats", name: "Overnight Oats", price: 4.99, image: "https://images.unsplash.com/photo-1497636577773-f1231844b336", desc: "Oats soaked with almond milk, berries & honey", prep: "2-3 min", category: "breakfast", tag: "Ready to Eat" },
    { id: "acai-bowl", name: "Acai Bowl", price: 8.49, image: "https://images.unsplash.com/photo-1546173159-315724a31696", desc: "Blended acai with granola & fresh fruit", prep: "5-8 min", category: "breakfast", tag: "Superfood" },

    // ── Coffee ──
    { id: "brewed-coffee", name: "Brewed Coffee", price: 4.29, image: "https://images.unsplash.com/photo-1511920170033-f8396924c348", desc: "Fresh brewed house blend", prep: "5-10 min", category: "coffee", tag: "Regular | Large" },
    { id: "vanilla-cold-brew", name: "Vanilla Cold Brew", price: 4.79, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735", desc: "Slow-steeped cold brew with vanilla", prep: "5-8 min", category: "coffee", tag: "Regular | Large" },
    { id: "cold-brew", name: "Cold Brew", price: 4.49, image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c", desc: "20-hour slow-steeped cold brew", prep: "3-5 min", category: "coffee", tag: "Regular | Large" },
    { id: "pour-over", name: "Pour Over", price: 4.99, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085", desc: "Hand-poured single origin coffee", prep: "5-8 min", category: "coffee", tag: "Single Origin" },

    // ── Coffee Classics ──
    { id: "classic-latte", name: "Classic Latte", price: 4.99, image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefda", desc: "Espresso with steamed milk", prep: "5-8 min", category: "coffee-classics", tag: "Regular | Large" },
    { id: "classic-mocha", name: "Classic Mocha", price: 5.49, image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d", desc: "Espresso with chocolate & steamed milk", prep: "6-10 min", category: "coffee-classics", tag: "Regular | Large" },
    { id: "flat-white", name: "Flat White", price: 5.29, image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93", desc: "Ristretto with velvety steamed milk", prep: "5-8 min", category: "coffee-classics", tag: "Regular | Large" },
    { id: "classic-macchiato", name: "Classic Macchiato", price: 4.79, image: "https://images.unsplash.com/photo-1485808191679-5f86510681a1", desc: "Espresso marked with a dash of foam", prep: "4-6 min", category: "coffee-classics", tag: "Single | Double" },

    // ── Drip ──
    { id: "house-drip", name: "House Drip", price: 3.49, image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31", desc: "Fresh drip-brewed house blend", prep: "2-4 min", category: "drip", tag: "Regular | Large" },
    { id: "bold-roast", name: "Bold Roast", price: 3.49, image: "https://images.unsplash.com/photo-1511920170033-f8396924c348", desc: "Dark roast drip coffee, full bodied", prep: "2-4 min", category: "drip", tag: "Regular | Large" },
    { id: "blonde-roast", name: "Blonde Roast", price: 3.49, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085", desc: "Light roast with bright, smooth flavor", prep: "2-4 min", category: "drip", tag: "Regular | Large" },

    // ── Espresso ──
    { id: "espresso-shot", name: "Espresso Shot", price: 3.29, image: "https://images.unsplash.com/photo-1521305916504-4a1121188589", desc: "Single or double shot", prep: "10-15 min", category: "espresso", tag: "Single | Double" },
    { id: "americano", name: "Americano", price: 3.99, image: "https://images.unsplash.com/photo-1551030173-122aabc4489c", desc: "Espresso with hot water", prep: "5-15 min", category: "espresso", tag: "Regular | Large" },
    { id: "ristretto", name: "Ristretto", price: 3.49, image: "https://images.unsplash.com/photo-1521305916504-4a1121188589", desc: "Short, concentrated espresso shot", prep: "3-5 min", category: "espresso", tag: "Single | Double" },

    // ── Espresso Drinks ──
    { id: "caramel-latte", name: "Caramel Latte", price: 5.49, image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93", desc: "Espresso with steamed milk & caramel", prep: "10-12 min", category: "espresso-drinks", tag: "Regular | Large" },
    { id: "cappuccino", name: "Cappuccino", price: 5.19, image: "https://images.unsplash.com/photo-1534778101976-62847782c213", desc: "Double shot with foamed milk", prep: "13-15 min", category: "espresso-drinks", tag: "Regular | Large" },
    { id: "iced-mocha", name: "Iced Mocha", price: 5.99, image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d", desc: "Chilled espresso with chocolate & milk", prep: "14-16 min", category: "espresso-drinks", tag: "Regular | Large" },
    { id: "cortado", name: "Cortado", price: 4.49, image: "https://images.unsplash.com/photo-1485808191679-5f86510681a1", desc: "Equal parts espresso & warm milk", prep: "4-6 min", category: "espresso-drinks", tag: "Standard" },

    // ── Food ──
    { id: "bagel-cream-cheese", name: "Bagel & Cream Cheese", price: 3.60, image: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0", desc: "Toasted bagel with cream cheese", prep: "13-15 min", category: "food", tag: "Plain | Everything" },
    { id: "butter-croissant", name: "Butter Croissant", price: 3.25, image: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd", desc: "Freshly baked flaky croissant", prep: "12-15 min", category: "food", tag: "Plain | Chocolate" },
    { id: "blueberry-muffin", name: "Blueberry Muffin", price: 3.75, image: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa", desc: "Moist blueberry muffin with crumb topping", prep: "3-5 min", category: "food", tag: "Fresh Baked" },
    { id: "chocolate-chip-cookie", name: "Chocolate Chip Cookie", price: 2.50, image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e", desc: "Warm chocolate chip cookie", prep: "3-5 min", category: "food", tag: "Fresh Baked" },
    { id: "avocado-toast", name: "Avocado Toast", price: 6.99, image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d", desc: "Smashed avocado on sourdough toast", prep: "8-10 min", category: "food", tag: "Sourdough" },
    { id: "turkey-sandwich", name: "Turkey Sandwich", price: 7.49, image: "https://images.unsplash.com/photo-1539252554453-80ab65ce3586", desc: "Sliced turkey with lettuce, tomato & cheese", prep: "8-12 min", category: "food", tag: "On Ciabatta" },
    { id: "cinnamon-roll", name: "Cinnamon Roll", price: 4.25, image: "https://images.unsplash.com/photo-1509365390695-33aee754301f", desc: "Warm cinnamon roll with cream cheese icing", prep: "5-8 min", category: "food", tag: "Fresh Baked" },
    { id: "fruit-cup", name: "Fresh Fruit Cup", price: 4.50, image: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea", desc: "Seasonal fresh cut fruit medley", prep: "3-5 min", category: "food", tag: "Seasonal" },

    // ── Hot Coffee & Tea ──
    { id: "hot-chai-latte", name: "Hot Chai Latte", price: 4.99, image: "https://images.unsplash.com/photo-1557006021-b85faa2bc5e2", desc: "Spiced black tea with steamed milk", prep: "5-8 min", category: "hot-coffee-tea", tag: "Regular | Large" },
    { id: "hot-matcha-latte", name: "Hot Matcha Latte", price: 5.49, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574", desc: "Ceremonial matcha with steamed milk", prep: "5-8 min", category: "hot-coffee-tea", tag: "Regular | Large" },
    { id: "hot-chocolate", name: "Hot Chocolate", price: 4.49, image: "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8", desc: "Rich chocolate with steamed milk & whip", prep: "4-6 min", category: "hot-coffee-tea", tag: "Regular | Large" },
    { id: "turmeric-latte", name: "Turmeric Latte", price: 5.29, image: "https://images.unsplash.com/photo-1511920170033-f8396924c348", desc: "Golden turmeric with steamed milk & honey", prep: "5-8 min", category: "hot-coffee-tea", tag: "Regular | Large" },

    // ── Hot Drinks ──
    { id: "steamer", name: "Steamer", price: 3.99, image: "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8", desc: "Steamed milk with your choice of flavor", prep: "3-5 min", category: "hot-drinks", tag: "Regular | Large" },
    { id: "hot-apple-cider", name: "Hot Apple Cider", price: 4.29, image: "https://images.unsplash.com/photo-1574914629385-46448b767aec", desc: "Warm spiced apple cider", prep: "4-6 min", category: "hot-drinks", tag: "Regular | Large" },
    { id: "london-fog", name: "London Fog", price: 4.99, image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f", desc: "Earl Grey tea with vanilla & steamed milk", prep: "5-8 min", category: "hot-drinks", tag: "Regular | Large" },

    // ── Iced Drinks ──
    { id: "iced-caramel-macchiato", name: "Iced Caramel Macchiato", price: 5.79, image: "https://images.unsplash.com/photo-1545438102-799c3991ffef", desc: "Vanilla, milk, espresso & caramel drizzle", prep: "5-8 min", category: "iced-drinks", tag: "Regular | Large" },
    { id: "iced-vanilla-latte", name: "Iced Vanilla Latte", price: 5.49, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735", desc: "Espresso with cold milk & vanilla syrup", prep: "4-6 min", category: "iced-drinks", tag: "Regular | Large" },
    { id: "iced-matcha", name: "Iced Matcha", price: 5.49, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574", desc: "Ceremonial matcha shaken with ice & milk", prep: "4-6 min", category: "iced-drinks", tag: "Regular | Large" },
    { id: "iced-chai", name: "Iced Chai", price: 4.99, image: "https://images.unsplash.com/photo-1557006021-b85faa2bc5e2", desc: "Spiced chai tea with cold milk over ice", prep: "4-6 min", category: "iced-drinks", tag: "Regular | Large" },

    // ── Lattes ──
    { id: "vanilla-latte", name: "Vanilla Latte", price: 5.29, image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefda", desc: "Espresso with vanilla & steamed milk", prep: "5-8 min", category: "lattes", tag: "Regular | Large" },
    { id: "pumpkin-spice-latte", name: "Pumpkin Spice Latte", price: 5.79, image: "https://images.unsplash.com/photo-1574914629385-46448b767aec", desc: "Espresso with pumpkin, cinnamon & milk", prep: "6-8 min", category: "lattes", tag: "Regular | Large" },
    { id: "lavender-latte", name: "Lavender Latte", price: 5.49, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085", desc: "Espresso with lavender syrup & milk", prep: "5-8 min", category: "lattes", tag: "Regular | Large" },
    { id: "honey-oat-latte", name: "Honey Oat Latte", price: 5.49, image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93", desc: "Espresso with honey, oat milk & cinnamon", prep: "5-8 min", category: "lattes", tag: "Regular | Large" },

    // ── Seasonal Menu ──
    { id: "peppermint-mocha", name: "Peppermint Mocha", price: 5.99, image: "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8", desc: "Mocha with peppermint & whipped cream", prep: "6-10 min", category: "seasonal", tag: "Limited Time" },
    { id: "gingerbread-latte", name: "Gingerbread Latte", price: 5.79, image: "https://images.unsplash.com/photo-1574914629385-46448b767aec", desc: "Espresso with gingerbread spice & milk", prep: "6-8 min", category: "seasonal", tag: "Limited Time" },
    { id: "eggnog-latte", name: "Eggnog Latte", price: 5.99, image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefda", desc: "Espresso blended with rich eggnog", prep: "6-8 min", category: "seasonal", tag: "Limited Time" },
    { id: "winter-spice-cider", name: "Winter Spice Cider", price: 4.99, image: "https://images.unsplash.com/photo-1574914629385-46448b767aec", desc: "Warm apple cider with winter spices", prep: "5-8 min", category: "seasonal", tag: "Limited Time" },

    // ── Tea Lattes ──
    { id: "chai-tea-latte", name: "Chai Tea Latte", price: 4.99, image: "https://images.unsplash.com/photo-1557006021-b85faa2bc5e2", desc: "Spiced black tea with steamed milk", prep: "5-8 min", category: "tea-lattes", tag: "Hot | Iced" },
    { id: "matcha-tea-latte", name: "Matcha Tea Latte", price: 5.29, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574", desc: "Premium matcha with steamed milk", prep: "5-8 min", category: "tea-lattes", tag: "Hot | Iced" },
    { id: "london-fog-latte", name: "London Fog Latte", price: 4.99, image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f", desc: "Earl Grey with vanilla & steamed milk", prep: "5-8 min", category: "tea-lattes", tag: "Hot | Iced" },
    { id: "dirty-chai-latte", name: "Dirty Chai Latte", price: 5.49, image: "https://images.unsplash.com/photo-1557006021-b85faa2bc5e2", desc: "Chai tea latte with a shot of espresso", prep: "6-8 min", category: "tea-lattes", tag: "Hot | Iced" },

    // ── Teas ──
    { id: "english-breakfast-tea", name: "English Breakfast Tea", price: 3.29, image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f", desc: "Classic full-bodied black tea", prep: "3-5 min", category: "teas", tag: "Hot | Iced" },
    { id: "green-tea", name: "Green Tea", price: 3.29, image: "https://images.unsplash.com/photo-1558160074-4d7d8bdf4256", desc: "Light and refreshing green tea", prep: "3-5 min", category: "teas", tag: "Hot | Iced" },
    { id: "chamomile-tea", name: "Chamomile Tea", price: 3.29, image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f", desc: "Calming herbal chamomile infusion", prep: "3-5 min", category: "teas", tag: "Hot" },
    { id: "earl-grey", name: "Earl Grey", price: 3.29, image: "https://images.unsplash.com/photo-1525351484163-7529414344d8", desc: "Bergamot-infused black tea", prep: "3-5 min", category: "teas", tag: "Hot | Iced" },
    { id: "peppermint-tea", name: "Peppermint Tea", price: 3.29, image: "https://images.unsplash.com/photo-1558160074-4d7d8bdf4256", desc: "Refreshing peppermint herbal tea", prep: "3-5 min", category: "teas", tag: "Hot" }
  ];

  function getProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }
  function getProductsByCategory(cat) {
    return PRODUCTS.filter(function (p) { return p.category === cat; });
  }
  function isFoodCategory(cat) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === cat) return !!CATEGORIES[i].isFood;
    }
    return false;
  }

  // ---- init ----
  document.addEventListener("DOMContentLoaded", function () {
    updateBadge();
    // Backward compat: auto-set session for existing users
    if (getUser() && localStorage.getItem("pb_session") === null) {
      localStorage.setItem("pb_session", "1");
    }
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
    CATEGORIES: CATEGORIES,
    PRODUCTS: PRODUCTS,
    getProduct: getProduct,
    getProductsByCategory: getProductsByCategory,
    isFoodCategory: isFoodCategory
  };
})();
