package com.chillnight.pos.viewmodel

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chillnight.pos.model.*
import com.chillnight.pos.network.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.net.URLEncoder
import java.util.UUID

class AppViewModel : ViewModel() {

    // Auth State (Direct App Access without Login requirement)
    private val _isLoggedIn = MutableStateFlow(true)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _ownerInfo = MutableStateFlow<OwnerInfo?>(null)
    val ownerInfo: StateFlow<OwnerInfo?> = _ownerInfo.asStateFlow()

    private val _authError = MutableStateFlow<String?>(null)
    val authError: StateFlow<String?> = _authError.asStateFlow()

    // Dashboard State
    private val _dashboardStats = MutableStateFlow<DashboardStats?>(null)
    val dashboardStats: StateFlow<DashboardStats?> = _dashboardStats.asStateFlow()

    private val _isLoadingStats = MutableStateFlow(false)
    val isLoadingStats: StateFlow<Boolean> = _isLoadingStats.asStateFlow()

    // Menu State
    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories: StateFlow<List<Category>> = _categories.asStateFlow()

    private val _menuItems = MutableStateFlow<List<MenuItem>>(emptyList())
    val menuItems: StateFlow<List<MenuItem>> = _menuItems.asStateFlow()

    private val _isLoadingMenu = MutableStateFlow(false)
    val isLoadingMenu: StateFlow<Boolean> = _isLoadingMenu.asStateFlow()

    // Order History State
    private val _orders = MutableStateFlow<List<Order>>(emptyList())
    val orders: StateFlow<List<Order>> = _orders.asStateFlow()

    private val _selectedStatusFilter = MutableStateFlow("ALL")
    val selectedStatusFilter: StateFlow<String> = _selectedStatusFilter.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _isLoadingOrders = MutableStateFlow(false)
    val isLoadingOrders: StateFlow<Boolean> = _isLoadingOrders.asStateFlow()

    // Active Order Creation (POS Cart) State
    val cartItems = MutableStateFlow<Map<String, Int>>(emptyMap()) // menuItemId -> quantity
    val itemNotes = MutableStateFlow<Map<String, String>>(emptyMap()) // menuItemId -> notes
    val customerName = MutableStateFlow("")
    val customerPhone = MutableStateFlow("")
    val orderType = MutableStateFlow("TAKEAWAY") // TAKEAWAY or DELIVERY
    val deliveryAddress = MutableStateFlow("")
    val deliveryFee = MutableStateFlow("150")
    val prepTimeMinutes = MutableStateFlow("20")
    val deliveryTimeMinutes = MutableStateFlow("20")
    val paymentMethod = MutableStateFlow("CASH") // CASH, CARD, ONLINE
    val amountPaid = MutableStateFlow("0")
    val orderNotes = MutableStateFlow("")

    private val _isSubmittingOrder = MutableStateFlow(false)
    val isSubmittingOrder: StateFlow<Boolean> = _isSubmittingOrder.asStateFlow()

    private val _lastCreatedOrder = MutableStateFlow<Order?>(null)
    val lastCreatedOrder: StateFlow<Order?> = _lastCreatedOrder.asStateFlow()

    // Selected Single Order Detail
    private val _currentOrderDetail = MutableStateFlow<Order?>(null)
    val currentOrderDetail: StateFlow<Order?> = _currentOrderDetail.asStateFlow()

    fun login(username: String, pass: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _authError.value = null
            try {
                val res = ApiClient.apiService.login(LoginRequest(username, pass))
                if (res.isSuccessful && res.body() != null) {
                    val body = res.body()!!
                    ApiClient.authToken = body.token
                    _ownerInfo.value = body.owner
                    _isLoggedIn.value = true
                    refreshAllData()
                    onSuccess()
                } else {
                    _authError.value = "Invalid username or password"
                }
            } catch (e: Exception) {
                _authError.value = "Connection error: ${e.localizedMessage}. Check server URL."
            }
        }
    }

    fun logout() {
        ApiClient.authToken = null
        _isLoggedIn.value = false
        _ownerInfo.value = null
    }

    fun refreshAllData() {
        loadDashboardStats()
        loadCategories()
        loadMenuItems()
        loadOrders()
    }

    fun loadDashboardStats() {
        viewModelScope.launch {
            _isLoadingStats.value = true
            try {
                val res = ApiClient.apiService.getDashboardStats()
                if (res.isSuccessful) {
                    _dashboardStats.value = res.body()
                }
            } catch (e: Exception) {
                // Keep last state
            } finally {
                _isLoadingStats.value = false
            }
        }
    }

    fun loadCategories() {
        viewModelScope.launch {
            try {
                val res = ApiClient.apiService.getCategories()
                if (res.isSuccessful) {
                    _categories.value = res.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    fun loadMenuItems(categoryId: String? = null) {
        viewModelScope.launch {
            _isLoadingMenu.value = true
            try {
                val res = ApiClient.apiService.getMenuItems(categoryId)
                if (res.isSuccessful) {
                    _menuItems.value = res.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // error handling
            } finally {
                _isLoadingMenu.value = false
            }
        }
    }

    fun addCategory(name: String, onDone: () -> Unit) {
        viewModelScope.launch {
            try {
                val res = ApiClient.apiService.addCategory(mapOf("name" to name))
                if (res.isSuccessful) {
                    loadCategories()
                    onDone()
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    fun addMenuItem(categoryId: String, name: String, desc: String, price: Double, onDone: () -> Unit) {
        viewModelScope.launch {
            try {
                val body = mapOf(
                    "categoryId" to categoryId,
                    "name" to name,
                    "description" to desc,
                    "price" to price,
                    "isAvailable" to 1
                )
                val res = ApiClient.apiService.addMenuItem(body)
                if (res.isSuccessful) {
                    loadMenuItems()
                    onDone()
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    fun updateMenuItem(id: String, categoryId: String, name: String, desc: String, price: Double, onDone: () -> Unit) {
        viewModelScope.launch {
            try {
                val body = mapOf(
                    "categoryId" to categoryId,
                    "name" to name,
                    "description" to desc,
                    "price" to price
                )
                val res = ApiClient.apiService.updateMenuItem(id, body)
                if (res.isSuccessful) {
                    loadMenuItems()
                    onDone()
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    fun toggleItemAvailability(id: String, currentStatus: Int) {
        viewModelScope.launch {
            try {
                val newStatus = if (currentStatus == 1) 0 else 1
                val res = ApiClient.apiService.toggleItemAvailability(id, mapOf("isAvailable" to newStatus))
                if (res.isSuccessful) {
                    _menuItems.value = _menuItems.value.map {
                        if (it.id == id) it.copy(isAvailable = newStatus) else it
                    }
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    fun deleteMenuItem(id: String) {
        viewModelScope.launch {
            try {
                val res = ApiClient.apiService.deleteMenuItem(id)
                if (res.isSuccessful) {
                    _menuItems.value = _menuItems.value.filter { it.id != id }
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    // Cart Management
    fun addToCart(menuItemId: String) {
        val current = cartItems.value.toMutableMap()
        current[menuItemId] = (current[menuItemId] ?: 0) + 1
        cartItems.value = current
    }

    fun removeFromCart(menuItemId: String) {
        val current = cartItems.value.toMutableMap()
        val qty = current[menuItemId] ?: 0
        if (qty > 1) {
            current[menuItemId] = qty - 1
        } else {
            current.remove(menuItemId)
        }
        cartItems.value = current
    }

    fun updateItemNote(menuItemId: String, note: String) {
        val current = itemNotes.value.toMutableMap()
        current[menuItemId] = note
        itemNotes.value = current
    }

    fun clearCart() {
        cartItems.value = emptyMap()
        itemNotes.value = emptyMap()
        customerName.value = ""
        customerPhone.value = ""
        orderType.value = "TAKEAWAY"
        deliveryAddress.value = ""
        amountPaid.value = "0"
        orderNotes.value = ""
    }

    fun calculateCartSubtotal(): Double {
        var subtotal = 0.0
        val itemsMap = _menuItems.value.associateBy { it.id }
        for ((id, qty) in cartItems.value) {
            val item = itemsMap[id]
            if (item != null) {
                subtotal += item.price * qty
            }
        }
        return subtotal
    }

    fun calculateTotalBill(): Double {
        val sub = calculateCartSubtotal()
        val fee = if (orderType.value == "DELIVERY") (deliveryFee.value.toDoubleOrNull() ?: 0.0) else 0.0
        return sub + fee
    }

    fun submitOrder(onSuccess: (Order) -> Unit, onError: (String) -> Unit) {
        if (customerName.value.trim().isEmpty()) {
            onError("Customer Name is required")
            return
        }
        if (customerPhone.value.trim().isEmpty()) {
            onError("Customer Phone number is required")
            return
        }
        if (cartItems.value.isEmpty()) {
            onError("Cart is empty. Add at least one item.")
            return
        }
        if (orderType.value == "DELIVERY" && deliveryAddress.value.trim().isEmpty()) {
            onError("Delivery Address is required for home delivery")
            return
        }

        viewModelScope.launch {
            _isSubmittingOrder.value = true
            try {
                val orderItemsReq = cartItems.value.map { (id, qty) ->
                    CreateOrderItemRequest(
                        menuItemId = id,
                        quantity = qty,
                        notes = itemNotes.value[id] ?: ""
                    )
                }

                val req = CreateOrderRequest(
                    clientSubmissionId = UUID.randomUUID().toString(),
                    customerName = customerName.value.trim(),
                    customerPhone = customerPhone.value.trim(),
                    orderType = orderType.value,
                    deliveryAddress = if (orderType.value == "DELIVERY") deliveryAddress.value.trim() else null,
                    items = orderItemsReq,
                    prepTimeMinutes = prepTimeMinutes.value.toIntOrNull() ?: 20,
                    deliveryTimeMinutes = deliveryTimeMinutes.value.toIntOrNull() ?: 20,
                    deliveryFee = if (orderType.value == "DELIVERY") (deliveryFee.value.toDoubleOrNull() ?: 0.0) else 0.0,
                    paymentMethod = paymentMethod.value,
                    amountPaid = amountPaid.value.toDoubleOrNull() ?: 0.0,
                    notes = orderNotes.value.trim()
                )

                val res = ApiClient.apiService.createOrder(req)
                if (res.isSuccessful && res.body() != null) {
                    val created = res.body()!!
                    _lastCreatedOrder.value = created
                    clearCart()
                    loadDashboardStats()
                    loadOrders()
                    onSuccess(created)
                } else {
                    onError("Order creation failed: ${res.errorBody()?.string() ?: res.message()}")
                }
            } catch (e: Exception) {
                onError("Network error: ${e.localizedMessage}")
            } finally {
                _isSubmittingOrder.value = false
            }
        }
    }

    // Orders Filter & List
    fun setStatusFilter(status: String) {
        _selectedStatusFilter.value = status
        loadOrders()
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
        loadOrders()
    }

    fun loadOrders() {
        viewModelScope.launch {
            _isLoadingOrders.value = true
            try {
                val statusParam = if (_selectedStatusFilter.value == "ALL") null else _selectedStatusFilter.value
                val searchParam = if (_searchQuery.value.trim().isEmpty()) null else _searchQuery.value.trim()
                val res = ApiClient.apiService.getOrders(status = statusParam, search = searchParam)
                if (res.isSuccessful) {
                    _orders.value = res.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // error handling
            } finally {
                _isLoadingOrders.value = false
            }
        }
    }

    fun loadOrderDetail(id: String) {
        viewModelScope.launch {
            try {
                val res = ApiClient.apiService.getOrderById(id)
                if (res.isSuccessful) {
                    _currentOrderDetail.value = res.body()
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    fun updateOrderStatus(id: String, newStatus: String, cancellationReason: String? = null) {
        viewModelScope.launch {
            try {
                val res = ApiClient.apiService.updateOrderStatus(id, UpdateStatusRequest(newStatus, cancellationReason))
                if (res.isSuccessful) {
                    _currentOrderDetail.value = res.body()
                    loadOrders()
                    loadDashboardStats()
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    fun updateOrderPayment(id: String, method: String?, paid: Double) {
        viewModelScope.launch {
            try {
                val res = ApiClient.apiService.updateOrderPayment(id, UpdatePaymentRequest(method, paid))
                if (res.isSuccessful) {
                    _currentOrderDetail.value = res.body()
                    loadOrders()
                    loadDashboardStats()
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    fun addEstimateMinutes(id: String, minutes: Int) {
        viewModelScope.launch {
            try {
                val res = ApiClient.apiService.addEstimateMinutes(id, AddEstimateRequest(minutes))
                if (res.isSuccessful) {
                    _currentOrderDetail.value = res.body()
                }
            } catch (e: Exception) {
                // error handling
            }
        }
    }

    // Direct WhatsApp Share Action
    fun shareOrderOnWhatsApp(context: Context, order: Order) {
        try {
            val orderType = if (order.orderType == "DELIVERY") "Home Delivery 🛵" else "Takeaway 🛍️"
            val deliveryOrPickupLabel = if (order.orderType == "DELIVERY") "Delivery" else "Pickup"
            val deliveryFeeLine = if (order.orderType == "DELIVERY") "🛵 Delivery Fee: Rs. ${order.deliveryFee.toInt()}\n" else ""
            val message = order.whatsappText ?: (
                "Assalam-o-Alaikum *${order.customerName}!* 🍔\n" +
                "Thank you for ordering from *Chill Night Food Point*.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━\n" +
                "📋 *ORDER #${order.orderNumber}* ($orderType)\n" +
                "━━━━━━━━━━━━━━━━━━━━\n\n" +
                deliveryFeeLine +
                "💰 *Total Bill: Rs. ${order.totalAmount.toInt()}*\n" +
                "💳 Payment: *${order.paymentStatus}* (${order.paymentMethod})\n" +
                "⏱️ Estimated $deliveryOrPickupLabel Time: *${order.estimatedReadyAt}*\n\n" +
                "━━━━━━━━━━━━━━━━━━━━\n" +
                "📍 *LIVE ORDER TRACKING:*\n" +
                "Tap the link below to track your order in real time:\n" +
                "${order.trackingUrl}\n" +
                "━━━━━━━━━━━━━━━━━━━━\n\n" +
                "_Chill Night Food Point — Fresh, Hot & Crispy!_"
            )

            val encodedMsg = URLEncoder.encode(message, "UTF-8")
            val uri = Uri.parse("https://api.whatsapp.com/send?phone=$phone&text=$encodedMsg")
            val intent = Intent(Intent.ACTION_VIEW, uri)
            context.startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(context, "Could not open WhatsApp: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }
}
