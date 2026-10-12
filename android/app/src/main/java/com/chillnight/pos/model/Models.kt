package com.chillnight.pos.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val owner: OwnerInfo
)

data class OwnerInfo(
    val id: String,
    val username: String,
    val restaurantName: String,
    val phone: String,
    val address: String
)

data class Category(
    val id: String,
    val name: String,
    @SerializedName("display_order") val displayOrder: Int = 0,
    @SerializedName("is_active") val isActive: Int = 1
)

data class MenuItem(
    val id: String,
    @SerializedName("category_id") val categoryId: String,
    @SerializedName("category_name") val categoryName: String? = null,
    val name: String,
    val description: String? = "",
    val price: Double,
    @SerializedName("is_available") val isAvailable: Int = 1
)

data class CreateOrderItemRequest(
    val menuItemId: String,
    val quantity: Int,
    val notes: String = ""
)

data class CreateOrderRequest(
    val clientSubmissionId: String? = null,
    val customerName: String,
    val customerPhone: String,
    val orderType: String, // DELIVERY or TAKEAWAY
    val deliveryAddress: String? = null,
    val items: List<CreateOrderItemRequest>,
    val prepTimeMinutes: Int = 20,
    val deliveryTimeMinutes: Int = 20,
    val deliveryFee: Double = 0.0,
    val paymentMethod: String = "CASH", // CASH, CARD, ONLINE
    val amountPaid: Double = 0.0,
    val notes: String = ""
)

data class OrderItem(
    val id: String,
    @SerializedName("order_id") val orderId: String? = null,
    @SerializedName("menu_item_id") val menuItemId: String? = null,
    val name: String,
    @SerializedName("unit_price") val unitPrice: Double,
    val quantity: Int,
    val subtotal: Double,
    val notes: String? = ""
)

data class Order(
    val id: String,
    @SerializedName("order_number") val orderNumber: Int,
    @SerializedName("tracking_token") val trackingToken: String,
    @SerializedName("customer_name") val customerName: String,
    @SerializedName("customer_phone") val customerPhone: String,
    @SerializedName("order_type") val orderType: String,
    @SerializedName("delivery_address") val deliveryAddress: String? = null,
    val status: String, // CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
    @SerializedName("cancellation_reason") val cancellationReason: String? = null,
    @SerializedName("prep_time_minutes") val prepTimeMinutes: Int = 20,
    @SerializedName("delivery_time_minutes") val deliveryTimeMinutes: Int = 20,
    @SerializedName("estimated_ready_at") val estimatedReadyAt: String,
    @SerializedName("estimated_delivery_at") val estimatedDeliveryAt: String? = null,
    @SerializedName("completed_at") val completedAt: String? = null,
    val subtotal: Double,
    @SerializedName("delivery_fee") val deliveryFee: Double = 0.0,
    @SerializedName("total_amount") val totalAmount: Double,
    @SerializedName("payment_method") val paymentMethod: String,
    @SerializedName("payment_status") val paymentStatus: String,
    @SerializedName("amount_paid") val amountPaid: Double = 0.0,
    @SerializedName("remaining_amount") val remainingAmount: Double = 0.0,
    val notes: String? = "",
    @SerializedName("created_at") val createdAt: String,
    val items: List<OrderItem>? = null,
    val trackingUrl: String? = null,
    val whatsappText: String? = null,
    val whatsappUrl: String? = null
)

data class UpdateStatusRequest(
    val status: String,
    val cancellationReason: String? = null
)

data class UpdatePaymentRequest(
    val paymentMethod: String? = null,
    val amountPaid: Double
)

data class AddEstimateRequest(
    val addMinutes: Int = 10
)

data class DashboardStats(
    val todayDatePkt: String,
    val todayOrdersCount: Int,
    val pendingOrdersCount: Int,
    val completedOrdersCount: Int,
    val todaySalesTotal: Double,
    val recentOrders: List<Order>? = null
)
